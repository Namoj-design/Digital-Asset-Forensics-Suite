import { asyncHandler } from '../utils/asyncHandler.js';
import path from 'path';
import { HttpError } from '../middlewares/errorHandler.js';
import { createEvidenceRecord, listByCase } from '../services/evidenceService.js';

export const postUpload = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new HttpError(400, 'file is required (field name: file)');
  }
  const caseId = req.body.case_id;
  if (!caseId) {
    throw new HttpError(400, 'case_id is required in multipart body');
  }

  const relativePath = path.join('uploads', req.file.filename);
  const row = await createEvidenceRecord(caseId, req.file.originalname, relativePath);
  res.status(201).json(row);
});

export const getEvidence = asyncHandler(async (req, res) => {
  const rows = await listByCase(req.params.case_id);
  res.json(rows);
});
