import { log } from '../utils/logger.js';
import { env } from '../config/env.js';

export function errorHandler(err, req, res, _next) {
  let status = err.statusCode || err.status || 500;
  if (err.name === 'MulterError' || /Only PDF and image files/i.test(err.message || '')) {
    status = 400;
  }
  const expose = err.expose !== false && status < 500;
  const message = expose ? err.message : status === 500 ? 'Internal server error' : err.message;

  if (status >= 500) {
    log.error(err.message, { stack: err.stack, path: req.path, method: req.method });
  } else {
    log.warn(err.message, { path: req.path, method: req.method });
  }

  res.status(status).json({
    error: message,
    ...(env.nodeEnv === 'development' && status === 500 ? { detail: err.message } : {}),
  });
}

export class HttpError extends Error {
  constructor(statusCode, message, expose = true) {
    super(message);
    this.statusCode = statusCode;
    this.expose = expose;
  }
}
