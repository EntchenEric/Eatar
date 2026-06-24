import { Router, Request, Response } from 'express';
import { Database } from 'sql.js';
import { save } from '../db';

function rowsToObj(result: { columns: string[]; values: any[][] }[] | undefined): Record<string, any>[] {
  if (!result || !result[0]) return [];
  return result[0].values.map(row => {
    const obj: Record<string, any> = {};
    result[0].columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

export default function swipesRouter(db: Database): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    const result = db.exec('SELECT * FROM swipes ORDER BY created_at DESC');
    res.json(rowsToObj(result));
  });

  router.get('/likes', (_req: Request, res: Response) => {
    const result = db.exec(`
      SELECT s.id, s.restaurant_id, s.direction, s.created_at,
             r.name, r.image_url, r.location, r.category, r.rating
      FROM swipes s
      JOIN restaurants r ON s.restaurant_id = r.id
      WHERE s.direction = 'like'
      ORDER BY s.created_at DESC
    `);
    res.json(rowsToObj(result));
  });

  router.post('/', (req: Request, res: Response) => {
    const { restaurant_id, direction } = req.body;
    if (!restaurant_id || !direction) {
      return res.status(400).json({ error: 'restaurant_id and direction are required' });
    }
    if (!['like', 'reject'].includes(direction)) {
      return res.status(400).json({ error: 'direction must be "like" or "reject"' });
    }
    // Check restaurant exists
    const restaurant = db.exec('SELECT id FROM restaurants WHERE id = ?', [restaurant_id]);
    if (!restaurant[0] || !restaurant[0].values[0]) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    // Check for existing swipe
    const existing = db.exec('SELECT id FROM swipes WHERE restaurant_id = ?', [restaurant_id]);
    if (existing[0] && existing[0].values[0]) {
      return res.status(409).json({ error: 'Already swiped on this restaurant' });
    }
    db.run('INSERT INTO swipes (restaurant_id, direction) VALUES (?, ?)', [restaurant_id, direction]);
    const idResult = db.exec('SELECT last_insert_rowid() as id');
    const newId = idResult[0].values[0][0];
    save();
    res.status(201).json({ id: newId, restaurant_id, direction });
  });

  router.delete('/', (_req: Request, res: Response) => {
    db.run('DELETE FROM swipes');
    save();
    res.json({ message: 'All swipes reset' });
  });

  return router;
}