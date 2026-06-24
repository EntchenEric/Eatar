import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { initDB, save, flushNow } from './db';
import { seed } from './db/seed';
import restaurantsRouter from './routes/restaurants';
import groupsRouter from './routes/groups';
import friendsRouter from './routes/friends';
import swipesRouter from './routes/swipes';
import settingsRouter from './routes/settings';
import uploadsRouter from './routes/uploads';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
// Größeres Limit, damit Base64-Image-Uploads akzeptiert werden
app.use(express.json({ limit: '8mb' }));

async function start() {
  const db = await initDB();
  await seed(db);

  app.use('/api/restaurants', restaurantsRouter(db));
  app.use('/api/groups', groupsRouter(db));
  app.use('/api/friends', friendsRouter(db));
  app.use('/api/swipes', swipesRouter(db));
  app.use('/api/settings', settingsRouter(db));
  app.use('/api/uploads', uploadsRouter());

  // Im Produktivbetrieb (Docker) liegt der fertige Frontend-Build in ../build
  // und wird vom selben Server ausgeliefert, sodass nur ein Port nötig ist.
  const buildDir = path.resolve(__dirname, '../../build');
  if (fs.existsSync(buildDir)) {
    app.use(express.static(buildDir));
    // SPA-Fallback: alle nicht-API-Routes liefern die React-App aus.
    app.get('*', (_req, res) => {
      res.sendFile(path.join(buildDir, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`🍕 EataR API running on http://localhost:${PORT}`);
  });

  // Flush debounced DB writes before the process exits so nothing is lost.
  ['SIGINT', 'SIGTERM', 'beforeExit', 'exit'].forEach((event) => {
    process.on(event, () => flushNow());
  });
}

start();