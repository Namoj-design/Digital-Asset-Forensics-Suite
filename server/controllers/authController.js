import { asyncHandler } from '../utils/asyncHandler.js';
import { login } from '../services/authService.js';

export const postLogin = asyncHandler(async (req, res) => {
  const result = await login(req.body);
  res.json(result);
});
