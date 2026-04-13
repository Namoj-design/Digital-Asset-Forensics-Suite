import { asyncHandler } from '../utils/asyncHandler.js';
import { buildGraphForAddress } from '../services/graphService.js';

export const getGraph = asyncHandler(async (req, res) => {
  const { address } = req.params;
  const { chain } = req.query;
  const graph = await buildGraphForAddress(address, chain || null);
  res.json(graph);
});
