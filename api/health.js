// GET /api/health: tells the app which backend features are switched on.
const db = require('./_lib/db');
const { route } = require('./_lib/http');

module.exports = route(['GET'], async (req, res) => {
  let database = false;
  if (db.ready()) {
    try { await db.q('crew?select=id&limit=1'); database = true; } catch (e) { console.error(e); }
  }
  res.status(200).json({
    ok: true,
    database,
    voice: Boolean(process.env.GEMINI_API_KEY),
    sensors: Boolean(process.env.DEVICE_KEY),
    time: new Date().toISOString()
  });
});
