import { asyncHandler } from '../utils/asyncHandler.js';
import { createTransaction, listByAddress } from '../services/transactionService.js';

export const postTransaction = asyncHandler(async (req, res) => {
  const row = await createTransaction(req.body);
  res.status(201).json(row);
});

export const getTransactionsByAddress = asyncHandler(async (req, res) => {
  const { address } = req.params;
  const { chain } = req.query;
  const rows = await listByAddress(address, chain || null);
  res.json(rows);
});
