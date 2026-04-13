import { query } from '../config/db.js';
import { HttpError } from '../middlewares/errorHandler.js';

export async function ensureAddress(client, chain, address, label = null) {
  const c = chain?.trim();
  const a = address?.trim();
  if (!c || !a) throw new HttpError(400, 'chain and address are required');

  const q = client ? client.query.bind(client) : query;

  const insert = await q(
    `INSERT INTO addresses (address, chain, label)
     VALUES ($1, $2, $3)
     ON CONFLICT (address, chain) DO UPDATE SET
       label = COALESCE(EXCLUDED.label, addresses.label)
     RETURNING *`,
    [a, c, label]
  );
  return insert.rows[0];
}

export async function refreshRiskScore(client, chain, address) {
  const q = client ? client.query.bind(client) : query;
  const a = address?.trim();
  const c = chain?.trim();
  const countRes = await q(
    `SELECT COUNT(*)::int AS n FROM transactions
     WHERE chain = $1 AND (from_address = $2 OR to_address = $2)`,
    [c, a]
  );
  const n = countRes.rows[0]?.n ?? 0;
  const risk = n * 2;
  await q(
    `UPDATE addresses SET risk_score = $1 WHERE chain = $2 AND address = $3`,
    [risk, c, a]
  );
  const row = await q(`SELECT * FROM addresses WHERE chain = $1 AND address = $2`, [c, a]);
  return row.rows[0];
}

export async function listByMinRisk({ chain, minRisk, limit = 100, offset = 0 }) {
  const lim = Math.min(Number(limit) || 100, 500);
  const off = Math.max(Number(offset) || 0, 0);
  const params = [minRisk, lim, off];
  let sql = `SELECT * FROM addresses WHERE risk_score >= $1`;
  if (chain) {
    sql += ` AND chain = $4`;
    params.push(chain);
  }
  sql += ` ORDER BY risk_score DESC, id ASC LIMIT $2 OFFSET $3`;
  const result = await query(sql, params);
  return result.rows;
}
