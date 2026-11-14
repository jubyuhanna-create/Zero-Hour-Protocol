// POST /api/checkin  Save a daily check-in (from the form or from the voice medic).
// GET  /api/checkin                newest check-in per crew member from the last 24 hours
// GET  /api/checkin?crew=CDR&days=14   history for one crew member

const db = require('./_lib/db');
const { CREW, body, num, str, fail, route } = require('./_lib/http');

const SYMPTOMS = ['chest', 'breath', 'vision', 'dizzy', 'headache', 'nausea', 'back', 'flank', 'abdomen', 'limb', 'fatigue', 'anxious'];

function clean(b) {
  return {
    crew_id: CREW.includes(b.crew_id) ? b.crew_id : null,
    source: b.source === 'voice' ? 'voice' : 'form',
    feel: num(b.feel, 1, 5),
    sleep: num(b.sleep, 0, 14),
    glucose: num(b.glucose, 20, 600),
    symptoms: (Array.isArray(b.symptoms) ? b.symptoms : []).filter(s => SYMPTOMS.includes(s)).slice(0, 12),
    pain_score: num(b.pain_score, 0, 10),
    pain_location: str(b.pain_location, 60) || null,
    transcript: str(b.transcript, 500) || null
  };
}

async function save(b) {
  const row = clean(b);
  if (!row.crew_id) throw Object.assign(new Error('crew_id must be one of ' + CREW.join(', ')), { status: 400 });
  const [saved] = await db.insert('checkins', [row]);
  return saved;
}

const handler = route(['GET', 'POST'], async (req, res) => {
  if (req.method === 'GET') {
    const crew = req.query.crew;
    if (crew) {
      if (!CREW.includes(crew)) return fail(res, 400, 'Unknown crew id');
      const days = num(req.query.days, 1, 365) || 14;
      const since = new Date(Date.now() - days * 86400_000).toISOString();
      const rows = await db.q(`checkins?select=*&crew_id=eq.${crew}&ts=gte.${since}&order=ts.asc`);
      return res.status(200).json({ crew, rows });
    }
    const since = new Date(Date.now() - 86400_000).toISOString();
    const rows = await db.q(`checkins?select=*&ts=gte.${since}&order=ts.desc&limit=200`);
    const latest = {};
    for (const r of rows) if (!latest[r.crew_id]) latest[r.crew_id] = r;
    return res.status(200).json({ latest });
  }
  try {
    const saved = await save(body(req));
    return res.status(201).json(saved);
  } catch (e) {
    if (e.status) return fail(res, e.status, e.message);
    throw e;
  }
});

module.exports = handler;
module.exports.save = save;
