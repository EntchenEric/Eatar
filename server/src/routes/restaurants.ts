import { Router, Request, Response } from 'express';
import { Database } from 'sql.js';
import { save } from '../db';
import { clearRestaurants, insertPlaces } from '../db/seed';
import { fetchPlaces, DEFAULT_CENTER, DEFAULT_RADIUS_M } from '../overpass';

export default function restaurantsRouter(db: Database): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    const result = db.exec('SELECT * FROM restaurants ORDER BY created_at DESC');
    if (!result[0]) return res.json([]);
    const rows = result[0].values.map(row => {
      const cols = result[0].columns;
      const obj: Record<string, any> = {};
      cols.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });
    res.json(rows);
  });

  // Echte Restaurants aus OpenStreetMap für einen Bereich (neu) laden.
  // Body (optional): { lat, lon, radiusKm }. Ohne Koordinaten → Default-Zentrum.
  router.post('/refresh', async (req: Request, res: Response) => {
    const lat = Number(req.body?.lat) || DEFAULT_CENTER.lat;
    const lon = Number(req.body?.lon) || DEFAULT_CENTER.lon;
    const radiusKm = Number(req.body?.radiusKm) || 0;
    // Suchradius: übergeben, sonst Default. Auf 50 km begrenzen, damit die
    // Overpass-Abfrage nicht ausufert.
    const radiusM = Math.min(
      radiusKm > 0 ? radiusKm * 1000 : DEFAULT_RADIUS_M,
      50000
    );

    try {
      const places = await fetchPlaces(lat, lon, radiusM);
      clearRestaurants(db);
      const inserted = insertPlaces(db, places);
      res.json({
        source: 'openstreetmap',
        lat,
        lon,
        radius_m: radiusM,
        found: places.length,
        inserted,
      });
    } catch (err) {
      console.error('Overpass refresh failed:', err);
      res.status(502).json({
        error: 'Daten konnten nicht von OpenStreetMap geladen werden.',
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  });

  router.get('/:id', (req: Request, res: Response) => {
    const result = db.exec('SELECT * FROM restaurants WHERE id = ?', [Number(req.params.id)]);
    if (!result[0] || !result[0].values[0]) return res.status(404).json({ error: 'Restaurant not found' });
    const cols = result[0].columns;
    const row = result[0].values[0];
    const obj: Record<string, any> = {};
    cols.forEach((col, i) => { obj[col] = row[i]; });
    res.json(obj);
  });

  router.post('/', (req: Request, res: Response) => {
    const { name, image_url, location, category, rating } = req.body;
    if (!name || !image_url || !location || !category) {
      return res.status(400).json({ error: 'name, image_url, location, category required' });
    }
    db.run(
      'INSERT INTO restaurants (name, image_url, location, category, rating) VALUES (?, ?, ?, ?, ?)',
      [name, image_url, location, category, rating || 0]
    );
    const idResult = db.exec('SELECT last_insert_rowid() as id');
    const newId = idResult[0].values[0][0];
    save();
    const created = db.exec('SELECT * FROM restaurants WHERE id = ?', [newId]);
    const cols = created[0].columns;
    const row = created[0].values[0];
    const obj: Record<string, any> = {};
    cols.forEach((col, i) => { obj[col] = row[i]; });
    res.status(201).json(obj);
  });

  router.put('/:id', (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const existing = db.exec('SELECT * FROM restaurants WHERE id = ?', [id]);
    if (!existing[0] || !existing[0].values[0]) return res.status(404).json({ error: 'Restaurant not found' });
    const cols = existing[0].columns;
    const oldRow = existing[0].values[0];
    const oldObj: Record<string, any> = {};
    cols.forEach((col, i) => { oldObj[col] = oldRow[i]; });

    const { name, image_url, location, category, rating } = req.body;
    db.run(
      'UPDATE restaurants SET name = ?, image_url = ?, location = ?, category = ?, rating = ? WHERE id = ?',
      [name ?? oldObj.name, image_url ?? oldObj.image_url, location ?? oldObj.location, category ?? oldObj.category, rating ?? oldObj.rating, id]
    );
    save();
    const updated = db.exec('SELECT * FROM restaurants WHERE id = ?', [id]);
    const uCols = updated[0].columns;
    const uRow = updated[0].values[0];
    const obj: Record<string, any> = {};
    uCols.forEach((col, i) => { obj[col] = uRow[i]; });
    res.json(obj);
  });

  router.delete('/:id', (req: Request, res: Response) => {
    db.run('DELETE FROM restaurants WHERE id = ?', [Number(req.params.id)]);
    save();
    res.json({ message: 'Restaurant deleted' });
  });

  return router;
}