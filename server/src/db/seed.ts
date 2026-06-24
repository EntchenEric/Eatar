import { Database } from 'sql.js';
import { save } from './index';
import { fetchPlaces, DEFAULT_CENTER, DEFAULT_RADIUS_M, OsmPlace } from '../overpass';

/** Fügt Restaurants ein (mit lat/lon/osm). Idempotent via osm_id. */
export function insertPlaces(db: Database, places: OsmPlace[]): number {
  let inserted = 0;
  const insert = db.prepare(
    `INSERT INTO restaurants (name, image_url, location, category, rating, lat, lon, osm_type, osm_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  try {
    for (const p of places) {
      // Doppeltes Einfügen desselben OSM-Objekts verhindern
      if (p.osm_id) {
        const dup = db.exec('SELECT 1 FROM restaurants WHERE osm_type = ? AND osm_id = ?', [
          p.osm_type,
          p.osm_id,
        ]);
        if (dup[0]) continue;
      }
      insert.run([p.name, p.image_url, p.location, p.category, p.rating, p.lat, p.lon, p.osm_type, p.osm_id]);
      inserted++;
    }
  } finally {
    insert.free();
  }
  if (inserted > 0) save();
  return inserted;
}

/**
 * Löscht alle Restaurants (cascade löscht Swipes + Gruppenzuordnungen mit).
 */
export function clearRestaurants(db: Database): void {
  db.run('DELETE FROM restaurants');
  save();
}

/** Demo-Einträge, falls Overpass nicht erreichbar ist. */
function seedDemoRestaurants(db: Database): void {
  const restaurants = [
    ['Xiao', 'https://cdn.shopify.com/s/files/1/0747/5317/9944/files/xiao_800c6509-7d92-4961-b6f8-855fc006d4fe.jpg?v=1715830566', 'Buer', 'Asiatisch', 4.5],
    ["L'Osteria", 'https://scontent-fra5-2.xx.fbcdn.net/v/t1.6435-9/191283370_2837977103123466_2532114255220646892_n.jpg?_nc_cat=109', 'Gladbeck', 'Pizza', 4.2],
    ['McDonalds', 'https://mcdonalds-gelsenkirchen.de/wp-content/uploads/2025/10/25014_Fruehstueck_AlwaysOn_LSM_Beef_FN_Everts_AZ_1280x720px-1030x579.jpg', 'Gelsenkirchen', 'Fast Food', 3.8],
    ['Sushi Circle', 'https://cdn.shopify.com/s/files/1/0747/5317/9944/files/xiao_800c6509-7d92-4961-b6f8-855fc006d4fe.jpg?v=1715830566', 'Buer', 'Sushi', 4.7],
  ];
  const insert = db.prepare(
    'INSERT INTO restaurants (name, image_url, location, category, rating) VALUES (?, ?, ?, ?, ?)'
  );
  for (const r of restaurants) insert.run(r as any[]);
  insert.free();
  save();
}

function seedGroupsAndFriends(db: Database): void {
  const grResult = db.exec('SELECT COUNT(*) as count FROM groups');
  if (!grResult[0] || Number(grResult[0].values[0][0]) === 0) {
    const dogIcon = 'https://cdn.atriumhealth.org/dailydose/-/media/daily-dose-blog/featured-images/dogeating.jpg?mw=1024';
    const insertGroup = db.prepare('INSERT INTO groups (name, icon_url, members) VALUES (?, ?, ?)');
    insertGroup.run(['WG', dogIcon, 3]);
    insertGroup.run(['Mittags-Club', dogIcon, 5]);
    insertGroup.free();
  }

  const frResult = db.exec('SELECT COUNT(*) as count FROM friends');
  if (!frResult[0] || Number(frResult[0].values[0][0]) === 0) {
    const insertFriend = db.prepare('INSERT INTO friends (name, avatar_url, is_favorite) VALUES (?, ?, ?)');
    insertFriend.run(['Günther', 'https://thfvnext.bing.com/th/id/OIP.V8e4Du1taCwxiyriDqZN3QHaEK?w=316&h=180', 1]);
    insertFriend.run(['Silke', 'https://thfvnext.bing.com/th?q=Silke+Rebhan', 0]);
    insertFriend.run(['Beethoven', 'https://thfvnext.bing.com/th/id/OIP.D4HsIn9zmjgwE2ZE_XSWSAHaG7?w=185&h=180', 1]);
    insertFriend.free();
  }

  const set = db.exec('SELECT COUNT(*) as count FROM settings');
  if (!set[0] || Number(set[0].values[0][0]) === 0) {
    const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    insertSetting.run(['notifications', 'true']);
    insertSetting.run(['dark_mode', 'false']);
    insertSetting.run(['location', 'true']);
    insertSetting.run(['radius', '10']);
    insertSetting.free();
  }

  // Demo-Mitglieder: vorhandene Freunde den Gruppen zuordnen (nur, falls noch
  // keine Zuordnungen existieren). Jedes Mitglied ist gleichberechtigt.
  const gmResult = db.exec('SELECT COUNT(*) as count FROM group_members');
  if (!gmResult[0] || Number(gmResult[0].values[0][0]) === 0) {
    const friendIds = (db.exec('SELECT id FROM friends ORDER BY id ASC')[0]?.values ?? []).map(
      (r) => Number(r[0])
    );
    const groupRows = db.exec('SELECT id, name FROM groups ORDER BY id ASC')[0]?.values ?? [];
    const wgRow = groupRows.find((r) => String(r[1]) === 'WG');
    const clubRow = groupRows.find((r) => String(r[1]) === 'Mittags-Club');
    const insertMember = db.prepare('INSERT OR IGNORE INTO group_members (group_id, friend_id) VALUES (?, ?)');
    if (wgRow && friendIds.length > 0) {
      // WG bekommt alle drei Demo-Freunde.
      for (const fid of friendIds) insertMember.run([Number(wgRow[0]), fid]);
    }
    if (clubRow && friendIds.length >= 2) {
      // Mittags-Club bekommt die ersten beiden.
      insertMember.run([Number(clubRow[0]), friendIds[0]]);
      insertMember.run([Number(clubRow[0]), friendIds[1]]);
    }
    insertMember.free();
  }

  save();
}

export async function seed(db: Database): Promise<void> {
  const result = db.exec('SELECT COUNT(*) as count FROM restaurants');
  const restaurantCount = result[0] ? Number(result[0].values[0][0]) : 0;

  if (restaurantCount === 0) {
    // Echte Daten aus OpenStreetMap laden, Demo nur als Fallback.
    try {
      const places = await fetchPlaces(DEFAULT_CENTER.lat, DEFAULT_CENTER.lon, DEFAULT_RADIUS_M);
      if (places.length > 0) {
        insertPlaces(db, places);
        console.log(`🍕 ${places.length} echte Restaurants aus OpenStreetMap geladen.`);
      } else {
        seedDemoRestaurants(db);
        console.log('⚠️  Overpass lieferte keine Treffer – Demo-Daten verwendet.');
      }
    } catch (err) {
      console.error('⚠️  Overpass nicht erreichbar, verwende Demo-Daten:', err);
      seedDemoRestaurants(db);
    }
  }

  seedGroupsAndFriends(db);
}