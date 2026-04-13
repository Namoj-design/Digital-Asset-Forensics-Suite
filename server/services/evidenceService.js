import { query } from '../config/db.js';
import { HttpError } from '../middlewares/errorHandler.js';
import { getCaseById } from './caseService.js';

export async function createEvidenceRecord(caseId, fileName, filePath) {
  await getCaseById(caseId);
  const result = await query(
    `INSERT INTO evidence (case_id, file_name, file_path)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [Number(caseId), fileName, filePath]
  );
  return result.rows[0];
}

export async function listByCase(caseId) {
  await getCaseById(caseId);
  const result = await query(
    `SELECT * FROM evidence WHERE case_id = $1 ORDER BY uploaded_at DESC`,
    [Number(caseId)]
  );
  return result.rows;
}
