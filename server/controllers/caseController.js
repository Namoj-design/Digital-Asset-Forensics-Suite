import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createCase,
  listCases,
  getCaseById,
  updateCase,
  deleteCase,
} from '../services/caseService.js';

export const postCase = asyncHandler(async (req, res) => {
  const row = await createCase(req.body);
  res.status(201).json(row);
});

export const getCases = asyncHandler(async (req, res) => {
  const { page, limit, chain, status } = req.query;
  const result = await listCases({ page, limit, chain, status });
  res.json(result);
});

export const getCase = asyncHandler(async (req, res) => {
  const row = await getCaseById(req.params.id);
  res.json(row);
});

export const putCase = asyncHandler(async (req, res) => {
  const row = await updateCase(req.params.id, req.body);
  res.json(row);
});

export const removeCase = asyncHandler(async (req, res) => {
  await deleteCase(req.params.id);
  res.status(204).send();
});
