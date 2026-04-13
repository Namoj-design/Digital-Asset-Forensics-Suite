import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';
import { log } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, '../db/schema.sql');

function splitSql(sql) {
  return sql
    .split(/;\s*\n/)
    .map((s) => s.replace(/^\s*(--[^\n]*\n\s*)*/, '').trim())
    .filter((s) => s.length > 0);
}

async function migrate() {
  const raw = fs.readFileSync(schemaPath, 'utf8');
  const client = await pool.connect();
  try {
    for (const stmt of splitSql(raw)) {
      await client.query(stmt + ';');
    }
    log.info('Migration completed', { file: schemaPath });
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((e) => {
  log.error('Migration failed', { message: e.message, stack: e.stack });
  process.exit(1);
});
