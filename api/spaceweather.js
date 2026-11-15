// Use of AI: much of this code was written with Claude by Anthropic, guided and tested by the Zero Hour Protocol team.
// GET /api/spaceweather  Live solar flares and solar particle events from NASA DONKI (last 7 days).
// Uses NASA_API_KEY if set, otherwise NASA's public DEMO_KEY. Results are cached for 15 minutes
// on the server and on Vercel's edge, so the demo key's hourly limit is never reached.

const { route } = require('./_lib/http');

let cache = { at: 0, data: null };
const day = d => d.toISOString().slice(0, 10);
const rank = c => ({ X: 4, M: 3, C: 2, B: 1, A: 0 }[(c || 'A')[0]] || 0) * 100 + (parseFloat((c || 'A0').slice(1)) || 0);

async function donki(path, query) {
  const r = await fetch(`https://api.nasa.gov/DONKI/${path}?${query}`, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`DONKI ${path} answered ${r.status}`);
  const text = await r.text();
  return text ? JSON.parse(text) : [];
}

module.exports = route(['GET'], async (req, res) => {
  if (!cache.data || Date.now() - cache.at > 15 * 60_000) {
    const key = process.env.NASA_API_KEY || 'DEMO_KEY';
    const query = `startDate=${day(new Date(Date.now() - 7 * 86400_000))}&endDate=${day(new Date())}&api_key=${encodeURIComponent(key)}`;
    const [flr, sep] = await Promise.all([donki('FLR', query), donki('SEP', query)]);

    const now = Date.now();
    const recent = t => t && now - Date.parse(t) < 86400_000;
    const flares = (flr || [])
      .filter(f => f.classType)
      .map(f => ({ id: f.flrID, cls: f.classType, peak: f.peakTime || f.beginTime, region: f.activeRegionNum || null, link: f.link }))
      .sort((a, b) => rank(b.cls) - rank(a.cls));
    const seps = (sep || []).map(e => ({ id: e.sepID, time: e.eventTime, link: e.link }));
    const counts = { X: 0, M: 0, C: 0 };
    for (const f of flares) if (counts[f.cls[0]] !== undefined) counts[f.cls[0]]++;

    let alert = null;
    if (seps.some(e => recent(e.time))) alert = { level: 2, text: 'solar particle event in the last 24 hours' };
    else if (flares.some(f => f.cls[0] === 'X' && recent(f.peak))) alert = { level: 1, text: 'X class solar flare in the last 24 hours, particles may follow' };

    cache = {
      at: Date.now(),
      data: { source: 'NASA DONKI', fetched: new Date().toISOString(), days: 7, strongest: flares[0] || null, counts, flares: flares.slice(0, 20), seps, alert }
    };
  }
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
  return res.status(200).json(cache.data);
});
