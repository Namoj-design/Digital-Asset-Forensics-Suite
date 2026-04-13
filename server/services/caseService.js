import { query } from '../config/db.js';
import { HttpError } from '../middlewares/errorHandler.js';

export async function createCase(payload) {
  const { title, description, chain, status, created_by } = payload;
  if (!title?.trim()) throw new HttpError(400, 'title is required');
  if (!chain?.trim()) throw new HttpError(400, 'chain is required');
  const uid = Number(created_by);
  if (!Number.isInteger(uid) || uid < 1) throw new HttpError(400, 'created_by must be a valid user id');

  const userCheck = await query(`SELECT id FROM users WHERE id = $1`, [uid]);
  if (userCheck.rows.length === 0) throw new HttpError(400, 'created_by user does not exist');

  const result = await query(
    `INSERT INTO cases (title, description, chain, status, created_by)
     VALUES ($1, $2, $3, COALESCE($4, 'open'), $5)
     RETURNING *`,
    [title.trim(), description ?? null, chain.trim(), status ?? null, uid]
  );
  return result.rows[0];
}

export async function listCases({ page, limit, chain, status }) {
  const lim = Math.min(Number(limit) || 20, 100);
  const p = Math.max(Number(page) || 1, 1);
  const offset = (p - 1) * lim;

  const conditions = [];
  const params = [];
  let i = 1;

  if (chain) {
    conditions.push(`chain = $${i++}`);
    params.push(chain.trim());
  }
  if (status) {
    conditions.push(`status = $${i++}`);
    params.push(status.trim());
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await query(`SELECT COUNT(*)::int AS c FROM cases ${where}`, params);
  const total = countRes.rows[0].c;

  params.push(lim, offset);
  const listRes = await query(
    `SELECT c.*, u.name AS creator_name, u.email AS creator_email
     FROM cases c
     JOIN users u ON u.id = c.created_by
     ${where}
     ORDER BY c.created_at DESC
     LIMIT $${i} OFFSET $${i + 1}`,
    params
  );

  return {
    data: listRes.rows,
    pagination: {
      page: p,
      limit: lim,
      total,
      totalPages: Math.ceil(total / lim) || 0,
    },
  };
}

export async function getCaseById(id) {
  const nid = Number(id);
  if (!Number.isInteger(nid) || nid < 1) throw new HttpError(400, 'invalid case id');

  const result = await query(
    `SELECT c.*, u.name AS creator_name, u.email AS creator_email
     FROM cases c
     JOIN users u ON u.id = c.created_by
     WHERE c.id = $1`,
    [nid]
  );
  if (result.rows.length === 0) throw new HttpError(404, 'case not found');
  return result.rows[0];
}

export async function updateCase(id, payload) {
  await getCaseById(id);
  const nid = Number(id);
  const { title, description, chain, status } = payload;
  const fields = [];
  const values = [];
  let i = 1;

  if (title !== undefined) {
    if (!String(title).trim()) throw new HttpError(400, 'title cannot be empty');
    fields.push(`title = $${i++}`);
    values.push(String(title).trim());
  }
  if (description !== undefined) {
    fields.push(`description = $${i++}`);
    values.push(description);
  }
  if (chain !== undefined) {
    if (!String(chain).trim()) throw new HttpError(400, 'chain cannot be empty');
    fields.push(`chain = $${i++}`);
    values.push(String(chain).trim());
  }
  if (status !== undefined) {
    if (!String(status).trim()) throw new HttpError(400, 'status cannot be empty');
    fields.push(`status = $${i++}`);
    values.push(String(status).trim());
  }

  if (fields.length === 0) throw new HttpError(400, 'no fields to update');

  values.push(nid);
  const result = await query(
    `UPDATE cases SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return result.rows[0];
}

export async function deleteCase(id) {
  await getCaseById(id);
  const nid = Number(id);
  await query(`DELETE FROM cases WHERE id = $1`, [nid]);
}
