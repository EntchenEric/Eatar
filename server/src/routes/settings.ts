import { Router, Request, Response } from 'express';
import { Database, SqlValue } from 'sql.js';
import { save } from '../db';

export default function settingsRouter(db: Database): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    const result = db.exec('SELECT key, value FROM settings');
    const settings: Record<string, any> = {};
    if (result[0]) {
      for (const row of result[0].values) {
        const key = row[0] as string;
        const value = row[1] as string;
        if (value === 'true') settings[key] = true;
        else if (value === 'false') settings[key] = false;
        else if (!isNaN(Number(value))) settings[key] = Number(value);
        else settings[key] = value;
      }
    }
    res.json(settings);
  });

  router.put('/:key', (req: Request, res: Response) => {
    const key = req.params.key as SqlValue;
    const { value } = req.body;
    if (value === undefined) {
      return res.status(400).json({ error: 'value is required' });
    }
    const stringified = String(value) as SqlValue;
    // Upsert using INSERT OR REPLACE
    db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, stringified]);
    save();
    res.json({ key: req.params.key, value: String(value) });
  });

  router.delete('/:key', (req: Request, res: Response) => {
    const key = req.params.key as SqlValue;
    db.run('DELETE FROM settings WHERE key = ?', [key]);
    save();
    res.status(204).end();
  });

  return router;
}