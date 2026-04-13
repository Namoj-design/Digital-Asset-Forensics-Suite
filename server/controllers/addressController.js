import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../middlewares/errorHandler.js';
import { listByMinRisk } from '../services/addressService.js';

/** Bonus: filter addresses by minimum risk score (and optional chain). */
export const getAddressesByRisk = asyncHandler(async (req, res) => {
  const { min_risk, chain, limit, offset } = req.query;
  const minRisk = min_risk !== undefined ? Number(min_risk) : NaN;
  if (Number.isNaN(minRisk)) {
    throw new HttpError(400, 'min_risk query parameter is required and must be a number');
  }
  const rows = await listByMinRisk({
    chain: chain || null,
    minRisk,
    limit,
    offset,
  });
  res.json(rows);
});
