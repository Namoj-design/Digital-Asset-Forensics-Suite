import { findByEmail } from './userService.js';
import { HttpError } from '../middlewares/errorHandler.js';

/**
 * Minimal auth: user must exist; password checked against optional DEMO_PASSWORD env or any non-empty string in dev.
 */
export async function login({ email, password }) {
  if (!email?.trim()) throw new HttpError(400, 'email is required');
  if (!password || !String(password).length) throw new HttpError(400, 'password is required');

  const user = await findByEmail(email);
  if (!user) throw new HttpError(401, 'invalid credentials');

  const isProd = process.env.NODE_ENV === 'production';
  const expected =
    process.env.DEMO_PASSWORD ?? (isProd ? null : 'password');
  if (isProd && !expected) {
    throw new HttpError(503, 'DEMO_PASSWORD must be set for login in production');
  }
  if (password !== expected) {
    throw new HttpError(401, 'invalid credentials');
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    token: `mock-${user.id}-${Date.now()}`,
  };
}
