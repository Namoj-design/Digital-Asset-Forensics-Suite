import { query, withTransaction } from '../config/db.js';
import { HttpError } from '../middlewares/errorHandler.js';
import { ensureAddress, refreshRiskScore } from './addressService.js';

function parseValue(v) {
  if (v === undefined || v === null) return '0';
  const s = String(v).trim();
  if (!s) return '0';
  if (!/^-?\d+(\.\d+)?$/.test(s)) throw new HttpError(400, 'value must be a numeric string');
  return s;
}

export async function createTransaction(payload) {
  const {
    tx_hash,
    from_address,
    to_address,
    value,
    timestamp,
    chain,
  } = payload;

  const th = tx_hash?.trim();
  const from = from_address?.trim();
  const to = to_address?.trim();
  const c = chain?.trim();
  if (!th || !from || !to || !c) {
    throw new HttpError(400, 'tx_hash, from_address, to_address, and chain are required');
  }
  if (from === to) {
    throw new HttpError(400, 'from_address and to_address must differ');
  }

  const val = parseValue(value);
  let ts = timestamp ? new Date(timestamp) : new Date();
  if (Number.isNaN(ts.getTime())) throw new HttpError(400, 'invalid timestamp');

  return withTransaction(async (client) => {
    await ensureAddress(client, c, from, null);
    await ensureAddress(client, c, to, null);

    let row;
    try {
      const ins = await client.query(
        `INSERT INTO transactions (tx_hash, from_address, to_address, value, timestamp, chain)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [th, from, to, val, ts.toISOString(), c]
      );
      row = ins.rows[0];
    } catch (e) {
      if (e.code === '23505') {
        throw new HttpError(409, 'transaction already exists for this chain');
      }
      throw e;
    }

    await refreshRiskScore(client, c, from);
    await refreshRiskScore(client, c, to);

    return row;
  });
}

export async function listByAddress(address, chain = null) {
  const a = address?.trim();
  if (!a) throw new HttpError(400, 'address is required');

  const params = [a];
  let sql = `
    SELECT * FROM transactions
    WHERE (from_address = $1 OR to_address = $1)`;
  if (chain) {
    sql += ` AND chain = $2`;
    params.push(chain.trim());
  }
  sql += ` ORDER BY timestamp DESC`;
  const result = await query(sql, params);
  return result.rows;
}
