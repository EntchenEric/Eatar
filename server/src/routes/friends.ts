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
    // Convert is_favorite from 0/1 to boolean
    if ('is_favorite' in obj) obj.is_favorite = !!obj.is_favorite;
    return obj;
  });
}

export default function friendsRouter(db: Database): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    const result = db.exec('SELECT * FROM friends ORDER BY created_at DESC');
    res.json(rowsToObj(result));
  });

  router.post('/', (req: Request, res: Response) => {
    const { name, avatar_url } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const photo = avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=007AFF&color=fff&size=128`;
    db.run('INSERT INTO friends (name, avatar_url, is_favorite) VALUES (?, ?, 0)', [name, photo]);
    const idResult = db.exec('SELECT last_insert_rowid() as id');
    const newId = idResult[0].values[0][0];
    save();
    const created = db.exec('SELECT * FROM friends WHERE id = ?', [newId]);
    const obj = rowToObj(created?.[0]);
    if (obj) obj.is_favorite = !!obj.is_favorite;
    res.status(201).json(obj);
  });

  router.put('/:id', (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const existing = rowToObj(db.exec('SELECT * FROM friends WHERE id = ?', [id])?.[0]);
    if (!existing) return res.status(404).json({ error: 'Friend not found' });
    const { name, avatar_url, is_favorite } = req.body;
    const fav = is_favorite !== undefined ? (is_favorite ? 1 : 0) : existing.is_favorite;
    db.run(
      'UPDATE friends SET name = ?, avatar_url = ?, is_favorite = ? WHERE id = ?',
      [name ?? existing.name, avatar_url ?? existing.avatar_url, fav, id]
    );
    save();
    const updated = rowToObj(db.exec('SELECT * FROM friends WHERE id = ?', [id])?.[0]);
    if (updated) updated.is_favorite = !!updated.is_favorite;
    res.json(updated);
  });

  router.delete('/:id', (req: Request, res: Response) => {
    db.run('DELETE FROM friends WHERE id = ?', [Number(req.params.id)]);
    save();
    res.json({ message: 'Friend deleted' });
  });

  return router;
}