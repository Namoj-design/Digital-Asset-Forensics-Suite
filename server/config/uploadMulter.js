import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { env } from './env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getUploadRoot() {
  return env.uploadDir || path.join(__dirname, '../uploads');
}

export function ensureUploadDir() {
  const root = getUploadRoot();
  if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true });
  }
  return root;
}

export function createEvidenceUploader() {
  const uploadRoot = ensureUploadDir();

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadRoot),
    filename: (_req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${Date.now()}-${safe}`);
    },
  });

  function fileFilter(_req, file, cb) {
    const ok = /\.(pdf|png|jpe?g|gif|webp)$/i.test(file.originalname);
    if (ok) cb(null, true);
    else cb(new Error('Only PDF and image files are allowed'));
  }

  return multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter,
  });
}
