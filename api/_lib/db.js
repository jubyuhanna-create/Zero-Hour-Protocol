// Use of AI: much of this code was written with Claude by Anthropic, guided and tested by the Zero Hour Protocol team.
// Minimal Supabase client over the PostgREST HTTP API. No npm dependencies.
// Uses the service role key, so it must only ever run on the server.

const BASE = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const ready = () => Boolean(BASE && KEY);

async function q(path, { method = 'GET', body, prefer } = {}) {
  if (!ready()) throw new Error('Database is not configured');
  const r = await fetch(`${BASE}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: KEY,
      // New sb_secret_ keys go in the apikey header only. Legacy service_role keys are JWTs and also go in Authorization.
      ...(KEY.startsWith('eyJ') ? { Authorization: `Bearer ${KEY}` } : {}),
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Database ${r.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

const insert = (table, rows) => q(table, { method: 'POST', body: rows, prefer: 'return=representation' });

module.exports = { ready, q, insert };
