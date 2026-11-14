// Shared mission event log, so every device on the ship sees the same history.
// GET  /api/events            last 100 events, oldest first
// GET  /api/events?after=123  only events newer than id 123 (used for polling)
// POST /api/events            { crew_id, level: "i" | "0".."3", met, message }

const db = require('./_lib/db');
const { CREW, body, num, str, fail, route } = require('./_lib/http');

module.exports = route(['GET', 'POST'], async (req, res) => {
  if (req.method === 'GET') {
    const after = num(req.query.after, 0, Number.MAX_SAFE_INTEGER);
    const rows = after != null
      ? await db.q(`events?select=*&id=gt.${after}&order=id.asc&limit=200`)
      : (await db.q('events?select=*&order=id.desc&limit=100')).reverse();
    return res.status(200).json({ rows });
  }
  const b = body(req);
  const message = str(b.message, 300);
  if (!message) return fail(res, 400, 'message is required');
  const level = ['i', '0', '1', '2', '3'].includes(String(b.level)) ? String(b.level) : 'i';
  const [saved] = await db.insert('events', [{
    crew_id: CREW.includes(b.crew_id) ? b.crew_id : null,
    level,
    met: num(b.met, 0, 1e9),
    message
  }]);
  return res.status(201).json(saved);
});
