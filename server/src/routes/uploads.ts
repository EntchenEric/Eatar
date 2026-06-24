import { Router, Request, Response } from 'express';
import express from 'express';
import path from 'path';
import fs from 'fs';

const UPLOAD_DIR = path.resolve(__dirname, '../../data/uploads');
const URL_PREFIX = '/api/uploads';

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function safeExt(mimetype: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
  };
  return map[mimetype] || 'png';
}

export default function uploadsRouter(): Router {
  const router = Router();

  // Serve uploaded files
  router.use('/', express.static(UPLOAD_DIR));

  // POST a base64/data-url image, store it, return its public URL
  router.post('/', (req: Request, res: Response) => {
    const { image } = req.body || {};
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'image (data URL) required' });
    }

    // Accept either "data:<mime>;base64,<data>" or raw base64
    const match = image.match(/^data:([a-zA-Z0-9.\/+-]+);base64,(.+)$/);
    let mime = 'image/png';
    let base64 = image;
    if (match) {
      mime = match[1];
      base64 = match[2];
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(base64, 'base64');
    } catch {
      return res.status(400).json({ error: 'Invalid base64 data' });
    }

    // Cap at ~5 MB
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(413).json({ error: 'Image too large (max 5 MB)' });
    }

    const ext = safeExt(mime);
    const filename = `icon_${Date.now()}_${Math.floor(Math.random() * 1e6)}.${ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);

    res.status(201).json({ url: `${URL_PREFIX}/${filename}` });
  });

  return router;
}