import { Router, Request, Response } from 'express';
import { Database } from 'sql.js';
import { save } from '../db';

function rowToObj(result: { columns: string[]; values: any[][] } | undefined): Record<string, any> | null {
  if (!result || !result.values[0]) return null;
  const obj: Record<string, any> = {};
  result.columns.forEach((col, i) => { obj[col] = result.values[0][i]; });
  return obj;
}

function rowsToObj(result: { columns: string[]; values: any[][] }[] | undefined): Record<string, any>[] {
  if (!result || !result[0]) return [];
  return result[0].values.map(row => {
    const obj: Record<string, any> = {};
    result[0].columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

export default function groupsRouter(db: Database): Router {
  const router = Router();

  // Liefert die friend_ids aller Mitglieder einer Gruppe.
  function memberIdsOf(groupId: number): number[] {
    const result = db.exec('SELECT friend_id FROM group_members WHERE group_id = ?', [groupId]);
    return result[0] ? result[0].values.map(r => r[0] as number) : [];
  }

  // GET all groups — includes restaurant_ids and member_ids for each group.
  // `members` wird als Anzahl der tatsächlichen Mitglieder (group_members) abgeleitet.
  router.get('/', (_req: Request, res: Response) => {
    const groups = rowsToObj(db.exec('SELECT * FROM groups ORDER BY created_at DESC'));
    // Attach restaurant_ids to each group
    const grResult = db.exec('SELECT group_id, restaurant_id FROM group_restaurants');
    const grMap: Record<number, number[]> = {};
    if (grResult[0]) {
      for (const row of grResult[0].values) {
        const gid = row[0] as number;
        const rid = row[1] as number;
        if (!grMap[gid]) grMap[gid] = [];
        grMap[gid].push(rid);
      }
    }
    const result = groups.map((g: any) => {
      const member_ids = memberIdsOf(g.id);
      return {
        ...g,
        restaurant_ids: grMap[g.id] || [],
        member_ids,
        members: member_ids.length,
      };
    });
    res.json(result);
  });

  router.get('/:id', (req: Request, res: Response) => {
    const group = rowToObj(db.exec('SELECT * FROM groups WHERE id = ?', [Number(req.params.id)])?.[0]);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    const grResult = db.exec('SELECT restaurant_id FROM group_restaurants WHERE group_id = ?', [Number(req.params.id)]);
    const restaurant_ids = grResult[0] ? grResult[0].values.map(r => r[0] as number) : [];
    const member_ids = memberIdsOf(group.id);
    res.json({ ...group, restaurant_ids, member_ids, members: member_ids.length });
  });

  // GET Mitglieder einer Gruppe als vollständige Freund-Objekte.
  router.get('/:id/members', (req: Request, res: Response) => {
    const groupId = Number(req.params.id);
    const group = rowToObj(db.exec('SELECT * FROM groups WHERE id = ?', [groupId])?.[0]);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    const members = rowsToObj(db.exec(
      `SELECT f.* FROM friends f
       JOIN group_members gm ON gm.friend_id = f.id
       WHERE gm.group_id = ?
       ORDER BY gm.created_at ASC`, [groupId]
    ));
    res.json(members);
  });

  // Freund zur Gruppe hinzufügen.
  router.post('/:id/members', (req: Request, res: Response) => {
    const groupId = Number(req.params.id);
    const friendId = Number(req.body?.friend_id);
    if (!friendId) return res.status(400).json({ error: 'friend_id is required' });
    const group = rowToObj(db.exec('SELECT * FROM groups WHERE id = ?', [groupId])?.[0]);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    const friend = rowToObj(db.exec('SELECT * FROM friends WHERE id = ?', [friendId])?.[0]);
    if (!friend) return res.status(404).json({ error: 'Friend not found' });
    try {
      db.run('INSERT OR IGNORE INTO group_members (group_id, friend_id) VALUES (?, ?)', [groupId, friendId]);
      save();
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
    const member_ids = memberIdsOf(groupId);
    res.status(201).json({ group_id: groupId, member_ids, members: member_ids.length });
  });

  // Freund aus Gruppe entfernen.
  router.delete('/:id/members/:friendId', (req: Request, res: Response) => {
    const groupId = Number(req.params.id);
    const friendId = Number(req.params.friendId);
    db.run('DELETE FROM group_members WHERE group_id = ? AND friend_id = ?', [groupId, friendId]);
    save();
    const member_ids = memberIdsOf(groupId);
    res.json({ group_id: groupId, member_ids, members: member_ids.length });
  });

  // GET restaurants for a specific group
  router.get('/:id/restaurants', (req: Request, res: Response) => {
    const group = rowToObj(db.exec('SELECT * FROM groups WHERE id = ?', [Number(req.params.id)])?.[0]);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    const restaurants = rowsToObj(db.exec(
      `SELECT r.* FROM restaurants r
       JOIN group_restaurants gr ON r.id = gr.restaurant_id
       WHERE gr.group_id = ?
       ORDER BY r.created_at DESC`, [Number(req.params.id)]
    ));
    res.json(restaurants);
  });

  router.post('/', (req: Request, res: Response) => {
    const { name, icon_url, members } = req.body;
    if (!name || !icon_url) {
      return res.status(400).json({ error: 'name and icon_url required' });
    }
    try {
      db.run('INSERT INTO groups (name, icon_url, members) VALUES (?, ?, ?)', [name, icon_url, members || 1]);
      const idResult = db.exec('SELECT last_insert_rowid() as id');
      const newId = idResult[0].values[0][0];
      save();
      const created = rowToObj(db.exec('SELECT * FROM groups WHERE id = ?', [newId])?.[0]);
      res.status(201).json({ ...created, restaurant_ids: [] });
    } catch (err: any) {
      if (err.message?.includes('UNIQUE')) {
        return res.status(409).json({ error: 'Group name already exists' });
      }
      throw err;
    }
  });

  // POST — set restaurant_ids for a group (replaces all)
  router.post('/:id/restaurants', (req: Request, res: Response) => {
    const groupId = Number(req.params.id);
    const { restaurant_ids } = req.body;
    if (!Array.isArray(restaurant_ids)) {
      return res.status(400).json({ error: 'restaurant_ids must be an array' });
    }
    const group = rowToObj(db.exec('SELECT * FROM groups WHERE id = ?', [groupId])?.[0]);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    // Delete existing associations
    db.run('DELETE FROM group_restaurants WHERE group_id = ?', [groupId]);
    // Insert new associations
    const insertGR = db.prepare('INSERT INTO group_restaurants (group_id, restaurant_id) VALUES (?, ?)');
    for (const rid of restaurant_ids) {
      insertGR.run([groupId, rid]);
    }
    insertGR.free();
    save();
    res.json({ ...group, restaurant_ids });
  });

  // DELETE a restaurant from a group
  router.delete('/:id/restaurants/:restaurantId', (req: Request, res: Response) => {
    const groupId = Number(req.params.id);
    const restaurantId = Number(req.params.restaurantId);
    db.run('DELETE FROM group_restaurants WHERE group_id = ? AND restaurant_id = ?', [groupId, restaurantId]);
    save();
    res.json({ message: 'Restaurant removed from group' });
  });

  router.put('/:id', (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const existing = rowToObj(db.exec('SELECT * FROM groups WHERE id = ?', [id])?.[0]);
    if (!existing) return res.status(404).json({ error: 'Group not found' });
    const { name, icon_url, members } = req.body;
    db.run(
      'UPDATE groups SET name = ?, icon_url = ?, members = ? WHERE id = ?',
      [name ?? existing.name, icon_url ?? existing.icon_url, members ?? existing.members, id]
    );
    save();
    const grResult = db.exec('SELECT restaurant_id FROM group_restaurants WHERE group_id = ?', [id]);
    const restaurant_ids = grResult[0] ? grResult[0].values.map(r => r[0] as number) : [];
    res.json({ ...rowToObj(db.exec('SELECT * FROM groups WHERE id = ?', [id])?.[0]), restaurant_ids });
  });

  router.delete('/:id', (req: Request, res: Response) => {
    db.run('DELETE FROM groups WHERE id = ?', [Number(req.params.id)]);
    save();
    res.json({ message: 'Group deleted' });
  });

  return router;
}