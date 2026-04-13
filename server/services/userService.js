import { query } from '../config/db.js';
import { HttpError } from '../middlewares/errorHandler.js';

export async function findByEmail(email) {
  const e = email?.trim().toLowerCase();
  if (!e) return null;
  const result = await query(`SELECT * FROM users WHERE lower(email) = $1`, [e]);
  return result.rows[0] || null;
}

export async function getById(id) {
  const result = await query(`SELECT id, name, email, role, created_at FROM users WHERE id = $1`, [id]);
  if (result.rows.length === 0) throw new HttpError(404, 'user not found');
  return result.rows[0];
}
