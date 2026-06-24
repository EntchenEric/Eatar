/**
 * Echte Restaurant-/Café-Daten über die OpenStreetMap Overpass API.
 *
 * - Kostenlos, kein API-Key, öffentlich nutzbar (Fair-Use-Limit reicht für
 *   eine Bereichsabfrage locker aus).
 * - Liefert echte Namen, Adressen, Kategorien und (soweit in OSM verlinkt)
 *   echte Fotos via Wikimedia Commons.
 * - Bewertungen gibt es in OSM nicht → rating bleibt 0 und wird im UI
 *   ausgeblendet (keine Fake-Bewertungen).
 *
 * @see https://wiki.openstreetmap.org/wiki/Overpass_API
 */

export interface OsmPlace {
  name: string;
  image_url: string;
  location: string;
  category: string;
  rating: number;
  lat: number;
  lon: number;
  osm_type: string;
  osm_id: number;
}

// Default-Zentrum: Gelsenkirchen-Buer (Ruhrgebiet) – passt zu den bisherigen
// Demo-Daten (Buer / Gladbeck / Gelsenkirchen). Über Umgebungsvariablen
// überschreibbar.
export const DEFAULT_CENTER = {
  lat: Number(process.env.EATER_LAT) || 51.5787,
  lon: Number(process.env.EATER_LON) || 6.9625,
};

// Standard-Suchradius in Metern für den initialen Seed / Refresh ohne Koordinaten.
// Bewusst klein gehalten, damit die Abfrage auf den freien Overpass-Servern
// zuverlässig durchgeht (kein Timeout/Rate-Limit).
export const DEFAULT_RADIUS_M = Number(process.env.EATER_RADIUS_M) || 3000;

// Über welche OSM-amenity-Werte wir suchen und wie sie auf App-Kategorien
// abgebildet werden.
const AMENITY_CATEGORY: Record<string, string> = {
  restaurant: 'Restaurant',
  cafe: 'Café',
  fast_food: 'Fast Food',
  pub: 'Pub',
  bar: 'Bar',
  biergarten: 'Biergarten',
  ice_cream: 'Eiscafé',
};

const AMENITIES = Object.keys(AMENITY_CATEGORY).join('|');

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

/**
 * Bild-URL aus OSM-Tags ableiten. Bevorzugt echte Fotos (Wikimedia Commons
 * über OSMs image-/wikimedia_commons-Tag), sonst ein deterministisches
 * Platzhalterbild (Lorem Picsum, kostenlos, kein Key). Das Platzhalterbild
 * ist repräsentativ, kein echtes Foto des Lokals.
 */
function resolveImage(tags: Record<string, string>, fallbackSeed: string): string {
  const raw = tags.image || tags['wikimedia_commons'] || tags['image:menu'] || '';
  if (!raw) {
    return `https://picsum.photos/seed/${encodeURIComponent(fallbackSeed)}/600/400`;
  }
  if (raw.startsWith('http')) return raw;
  // "File:XYZ.jpg" oder "XYZ.jpg" → über Special:FilePath direkt auflösbar
  const file = raw.replace(/^File:/i, '').replace(/^:/, '');
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=600`;
}

function buildLocation(tags: Record<string, string>): string {
  const street = [tags['addr:street'], tags['addr:housenumber']]
    .filter(Boolean)
    .join(' ')
    .trim();
  const city = tags['addr:city'] || '';
  const postcode = tags['addr:postcode'] || '';
  const full = [street, [postcode, city].filter(Boolean).join(' ').trim()]
    .filter(Boolean)
    .join(', ');
  if (full) return full;
  if (tags['addr:full']) return tags['addr:full'];
  return tags['name:en'] ? '' : ''; // ohne Adresse leer
}

function categoryFor(tags: Record<string, string>): string {
  const amenity = tags.amenity || '';
  if (amenity === 'restaurant' && tags.cuisine) {
    // z. B. "italian" → "Italienisch" – grob, ansonsten amenity-Label
    return cuisineLabel(tags.cuisine);
  }
  return AMENITY_CATEGORY[amenity] || 'Restaurant';
}

function cuisineLabel(cuisine: string): string {
  const first = cuisine.split(';')[0].trim().toLowerCase();
  const map: Record<string, string> = {
    italian: 'Italienisch',
    german: 'Deutsch',
    chinese: 'Asiatisch',
    japanese: 'Japanisch',
    indian: 'Indisch',
    thai: 'Thai',
    greek: 'Griechisch',
    turkish: 'Türkisch',
    mexican: 'Mexikanisch',
    french: 'Französisch',
    pizza: 'Pizza',
    burger: 'Burger',
    sushi: 'Sushi',
    vegan: 'Vegan',
    vegetarian: 'Vegetarisch',
    kebab: 'Döner',
    regional: 'Regional',
    seafood: 'Fisch',
  };
  return map[first] || 'Restaurant';
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/**
 * Holt echte POIs aus OpenStreetMap und normalisiert sie für die App.
 * Wirft bei einem echten Fehler (Netzwerk/HTTP), damit der Aufrufer
 * auf Demo-Daten zurückfallen kann.
 */
export async function fetchPlaces(
  lat: number,
  lon: number,
  radiusM: number
): Promise<OsmPlace[]> {
  // Nur Nodes (keine Ways) halten die Antwort klein → deutlich robuster
  // gegen Rate-Limiting/Timeouts der öffentlichen Overpass-Server.
  const query = `
    [out:json][timeout:30];
    node["amenity"~"^(${AMENITIES})$"](around:${radiusM},${lat},${lon});
    out body 250;
  `;

  const attempts: string[] = [];
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  // Bis zu 2 Runden über alle Endpunkte – die öffentlichen Server drosseln
  // manchmal kurzzeitig (429/504/remark), ein kurzer Retry reicht meist.
  for (let round = 0; round < 2; round++) {
    if (round > 0) await sleep(2000);
    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 35000);
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            // overpass-api.de lehnt Anfragen ohne erkennbaren User-Agent
            // mit HTTP 406 ab.
            'User-Agent': 'EataR/0.1 (+https://openstreetmap.org)',
          },
          body: 'data=' + encodeURIComponent(query),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) {
          attempts.push(`${new URL(endpoint).host}: HTTP ${res.status}`);
          continue;
        }
        const json = (await res.json()) as {
          elements?: OverpassElement[];
          remark?: string;
        };
        // Overpass liefert bei internem Fehler oft HTTP 200 + {remark: ...}.
        if (json.remark) {
          attempts.push(`${new URL(endpoint).host}: remark ${json.remark}`);
          continue;
        }
        return normalize(json.elements ?? []);
      } catch (err) {
        attempts.push(`${new URL(endpoint).host}: ${(err as Error).message}`);
      }
    }
  }
  throw new Error(
    `OpenStreetMap Overpass nicht erreichbar (${attempts.join(' | ')}). ` +
      'Später erneut versuchen – die öffentlichen Server drosseln bei viel Last.'
  );
}

function normalize(elements: OverpassElement[]): OsmPlace[] {
  const seen = new Set<string>();
  const places: OsmPlace[] = [];

  for (const el of elements) {
    const tags = el.tags || {};
    const name = tags.name || tags['name:de'] || '';
    if (!name) continue; // POI ohne Namen ist für uns unbrauchbar

    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null) continue;

    // Dedup über name + Adresse (OSM hat teils Knoten + Ways fürs glebe Lokal)
    const dedupeKey = `${name.toLowerCase()}|${buildLocation(tags)}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const location = buildLocation(tags) || 'Adresse unbekannt';
    places.push({
      name,
      image_url: resolveImage(tags, name),
      location,
      category: categoryFor(tags),
      rating: 0, // OSM hat keine Bewertungen
      lat,
      lon,
      osm_type: el.type,
      osm_id: el.id,
    });
  }

  return places;
}