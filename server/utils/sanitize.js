/**
 * Trim strings and strip null bytes from user-controlled text fields.
 */
export function sanitizeString(v, maxLen = 4096) {
  if (v === null || v === undefined) return v;
  if (typeof v !== 'string') return v;
  let s = v.replace(/\0/g, '').trim();
  if (s.length > maxLen) s = s.slice(0, maxLen);
  return s;
}

export function sanitizeObject(obj, maxDepth = 5) {
  if (maxDepth <= 0) return obj;
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map((x) =>
      typeof x === 'string' ? sanitizeString(x) : sanitizeObject(x, maxDepth - 1)
    );
  }
  if (typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') out[k] = sanitizeString(v);
    else if (v !== null && typeof v === 'object') out[k] = sanitizeObject(v, maxDepth - 1);
    else out[k] = v;
  }
  return out;
}
