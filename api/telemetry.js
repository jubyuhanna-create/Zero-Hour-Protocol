// POST /api/telemetry  Wearable sensors send vitals here.
//   Header:  x-device-key: <DEVICE_KEY>
//   Body:    { "crew_id": "CDR", "hr": 72, "spo2": 98, "activity": "rest" }  or an array of those
//   Each reading is triaged on the server and stored. Warning or critical readings also go to the event log.
// GET  /api/telemetry?latest=1            newest reading per crew member from the last 60 seconds
// GET  /api/telemetry?crew=CDR&minutes=30 history for one crew member

const db = require('./_lib/db');
const { CREW, body, num, str, fail, route } = require('./_lib/http');
const { triage } = require('./_lib/triage');

const ACTS = ['sleep', 'rest', 'work', 'exercise', 'eva'];

function clean(r) {
  const row = {
    crew_id: CREW.includes(r.crew_id) ? r.crew_id : null,
    source: str(r.source, 20) || 'sensor',
    activity: ACTS.includes(r.activity) ? r.activity : null,
    hr: num(r.hr, 20, 250),
    spo2: num(r.spo2, 50, 100),
    temp: num(r.temp, 30, 44),
    rr: num(r.rr, 2, 70),
    sbp: num(r.sbp, 50, 260),
    dbp: num(r.dbp, 30, 160),
    hrv: num(r.hrv, 1, 300),
    rad: num(r.rad, 0, 100000)
  };
  const hasVital = ['hr', 'spo2', 'temp', 'rr', 'sbp', 'rad'].some(k => row[k] != null);
  return row.crew_id && hasVital ? row : null;
}

module.exports = route(['GET', 'POST'], async (req, res) => {
  if (req.method === 'GET') {
    if (req.query.latest) {
      const since = new Date(Date.now() - 60_000).toISOString();
      const rows = await db.q(`telemetry?select=*&ts=gte.${since}&order=ts.desc&limit=200`);
      const latest = {};
      for (const r of rows) if (!latest[r.crew_id]) latest[r.crew_id] = r;
      return res.status(200).json({ now: new Date().toISOString(), latest });
    }
    const crew = req.query.crew;
    if (!CREW.includes(crew)) return fail(res, 400, 'crew must be one of ' + CREW.join(', '));
    const minutes = num(req.query.minutes, 1, 1440) || 30;
    const since = new Date(Date.now() - minutes * 60_000).toISOString();
    const rows = await db.q(`telemetry?select=*&crew_id=eq.${crew}&ts=gte.${since}&order=ts.asc&limit=2000`);
    return res.status(200).json({ crew, rows });
  }

  const expected = process.env.DEVICE_KEY;
  if (!expected) return fail(res, 503, 'Sensor upload is off. Set DEVICE_KEY on the server.');
  if (req.headers['x-device-key'] !== expected) return fail(res, 401, 'Wrong or missing x-device-key');

  const input = body(req);
  const list = (Array.isArray(input) ? input : [input]).slice(0, 50);
  const rows = list.map(clean).filter(Boolean);
  if (!rows.length) return fail(res, 400, 'Send crew_id and at least one vital sign');

  for (const r of rows) {
    const t = triage(r);
    Object.assign(r, { level: t.level, score: t.score, findings: t.findings });
  }
  const saved = await db.insert('telemetry', rows);

  const alerts = rows.filter(r => r.level >= 2).map(r => ({
    crew_id: r.crew_id,
    level: String(r.level),
    message: `${r.crew_id} sensor: ${r.findings[0] ? r.findings[0].msg : 'abnormal reading'}`
  }));
  if (alerts.length) await db.insert('events', alerts);

  return res.status(201).json({
    saved: saved.length,
    results: saved.map(r => ({ id: r.id, crew_id: r.crew_id, level: r.level, score: r.score, findings: r.findings }))
  });
});
