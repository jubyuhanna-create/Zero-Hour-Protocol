// Small helpers shared by the API routes.

const CREW = ['CDR', 'PLT', 'FE', 'MO'];

function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch { return {}; }
}

// Number in range or null. Anything else (text, NaN, out of range) is rejected as null.
function num(v, min, max) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

function str(v, max) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function fail(res, code, message) {
  return res.status(code).json({ error: message });
}

// Wraps a handler: method check, JSON errors instead of crashes.
function route(methods, handler) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!methods.includes(req.method)) return fail(res, 405, `Use ${methods.join(' or ')}`);
    try {
      return await handler(req, res);
    } catch (e) {
      console.error(e);
      return fail(res, e.message.startsWith('Database is not') ? 503 : 500, e.message);
    }
  };
}

module.exports = { CREW, body, num, str, fail, route };
