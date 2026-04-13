const level = process.env.LOG_LEVEL || 'info';

const levels = { debug: 10, info: 20, warn: 30, error: 40 };
const current = levels[level] ?? levels.info;

function ts() {
  return new Date().toISOString();
}

function logAt(lvl, msg, meta) {
  if (levels[lvl] < current) return;
  const line = meta !== undefined ? `${ts()} [${lvl.toUpperCase()}] ${msg} ${JSON.stringify(meta)}` : `${ts()} [${lvl.toUpperCase()}] ${msg}`;
  if (lvl === 'error') console.error(line);
  else if (lvl === 'warn') console.warn(line);
  else console.log(line);
}

export const log = {
  debug: (msg, meta) => logAt('debug', msg, meta),
  info: (msg, meta) => logAt('info', msg, meta),
  warn: (msg, meta) => logAt('warn', msg, meta),
  error: (msg, meta) => logAt('error', msg, meta),
};
