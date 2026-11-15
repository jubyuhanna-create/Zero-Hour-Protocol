// Use of AI: much of this code was written with Claude by Anthropic, guided and tested by the Zero Hour Protocol team.
// GET /api/report  Downlink report built on the server from the database:
// newest sensor reading, check-ins and events of the last 24 hours, for each crew member.
// ?format=json returns the same data as JSON.

const db = require('./_lib/db');
const { route } = require('./_lib/http');
const { LEVELS } = require('./_lib/triage');

const SYM = { chest: 'chest pain', breath: 'short of breath', vision: 'blurry vision', dizzy: 'dizziness', headache: 'headache', nausea: 'nausea', back: 'back pain', flank: 'pain in the side', abdomen: 'belly pain', limb: 'arm or leg pain', fatigue: 'exhaustion', anxious: 'anxiety' };

module.exports = route(['GET'], async (req, res) => {
  const since = new Date(Date.now() - 86400_000).toISOString();
  const [crew, tele, checks, events] = await Promise.all([
    db.q('crew?select=*&order=id'),
    db.q(`telemetry?select=*&ts=gte.${since}&order=ts.desc&limit=1000`),
    db.q(`checkins?select=*&ts=gte.${since}&order=ts.desc&limit=200`),
    db.q(`events?select=*&ts=gte.${since}&order=id.desc&limit=30`)
  ]);

  const data = crew.map(c => ({
    ...c,
    reading: tele.find(t => t.crew_id === c.id) || null,
    readings24h: tele.filter(t => t.crew_id === c.id).length,
    worst24h: Math.max(0, ...tele.filter(t => t.crew_id === c.id).map(t => t.level)),
    checkins: checks.filter(k => k.crew_id === c.id)
  }));

  if (req.query.format === 'json') return res.status(200).json({ generated: new Date().toISOString(), crew: data, events });

  const L = [];
  L.push('Zero Hour Protocol crew health downlink (server copy)');
  L.push(`Generated ${new Date().toISOString()} from the onboard database. Covers the last 24 hours.`);
  L.push('');
  for (const c of data) {
    L.push(`${c.name}, ${c.role} (${c.id})`);
    if (c.reading) {
      const r = c.reading;
      const v = [r.hr != null && `HR ${Math.round(r.hr)}`, r.spo2 != null && `SpO2 ${Math.round(r.spo2)}%`, r.temp != null && `temp ${r.temp}`, r.sbp != null && `BP ${Math.round(r.sbp)}/${Math.round(r.dbp || 0)}`].filter(Boolean).join(', ');
      L.push(`  Last sensor reading ${r.ts}: ${v}. ${LEVELS[r.level]}. ${c.readings24h} readings today, worst ${LEVELS[c.worst24h]}.`);
    } else L.push('  No sensor readings in the last 24 hours.');
    for (const k of c.checkins.slice(0, 3)) {
      const parts = [k.feel != null && `feeling ${k.feel}/5`, k.sleep != null && `slept ${k.sleep} h`, k.glucose != null && `glucose ${k.glucose} mg/dL`, k.symptoms.length && k.symptoms.map(s => SYM[s] || s).join(', '), k.pain_score != null && `pain ${k.pain_score}/10${k.pain_location ? ' ' + k.pain_location : ''}`].filter(Boolean);
      L.push(`  ${k.source === 'voice' ? 'Voice report' : 'Check-in'} ${k.ts}: ${parts.join(', ') || 'no details'}${k.transcript ? `. Said: "${k.transcript}"` : ''}`);
    }
  }
  L.push('');
  L.push('Recent events');
  for (const e of events.slice().reverse()) L.push(`  ${e.ts}  ${e.message}`);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return res.status(200).send(L.join('\n'));
});
