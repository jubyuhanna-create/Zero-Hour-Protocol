// Server side triage for one set of vitals. Same rules as the browser:
// NEWS2 bands applied to vitals corrected for the current activity.

const ACT = {
  sleep: { hr: -8, rr: -2, sbp: -6 },
  rest: {},
  work: { hr: 8, rr: 2, sbp: 5 },
  exercise: { hr: 55, rr: 10, sbp: 28 },
  eva: { hr: 30, rr: 6, sbp: 14 }
};

const LEVELS = ['normal', 'watch', 'warning', 'critical'];

function triage(r) {
  const fx = ACT[r.activity] || {};
  const sub = {};
  const f = [];

  if (r.spo2 != null) {
    sub.spo2 = r.spo2 >= 96 ? 0 : r.spo2 >= 94 ? 1 : r.spo2 >= 92 ? 2 : 3;
    if (sub.spo2) f.push({ sev: sub.spo2, msg: `Low blood oxygen, SpO2 ${Math.round(r.spo2)}%` });
  }
  if (r.hr != null) {
    const h = r.hr - (fx.hr || 0);
    sub.hr = h <= 40 || h >= 131 ? 3 : h >= 111 ? 2 : h <= 50 || h >= 91 ? 1 : 0;
    if (sub.hr) f.push({ sev: sub.hr, msg: `${h > 70 ? 'Fast' : 'Slow'} heart rate, ${Math.round(r.hr)} bpm` });
  }
  if (r.rr != null) {
    const x = r.rr - (fx.rr || 0);
    sub.rr = x <= 8 || x >= 25 ? 3 : x >= 21 ? 2 : x <= 11 ? 1 : 0;
    if (sub.rr) f.push({ sev: sub.rr, msg: `Breathing ${Math.round(r.rr)} times a minute` });
  }
  if (r.temp != null) {
    sub.temp = r.temp <= 35 ? 3 : r.temp >= 39.1 ? 2 : r.temp <= 36 || r.temp >= 38.1 ? 1 : 0;
    if (sub.temp) f.push({ sev: sub.temp, msg: `Body temperature ${r.temp.toFixed(1)} C` });
  }
  if (r.sbp != null) {
    const s = r.sbp - (fx.sbp || 0);
    sub.sbp = s <= 90 || s >= 220 ? 3 : s <= 100 ? 2 : s <= 110 ? 1 : 0;
    if (sub.sbp) f.push({ sev: sub.sbp, msg: `Blood pressure ${Math.round(r.sbp)}${r.dbp ? '/' + Math.round(r.dbp) : ''}` });
  }
  if (r.rad != null) {
    sub.rad = r.rad > 2000 ? 3 : r.rad > 500 ? 2 : r.rad > 200 ? 1 : 0;
    if (sub.rad) f.push({ sev: sub.rad, msg: `Radiation ${Math.round(r.rad)} uSv/h` });
  }

  const score = Object.values(sub).reduce((a, b) => a + b, 0);
  const max = Math.max(0, ...f.map(x => x.sev));
  let level = 0;
  if (score >= 7 || (r.spo2 != null && r.spo2 <= 88)) level = 3;
  else if (score >= 5 || max >= 3) level = 2;
  else if (max >= 2) level = 2;
  else if (max >= 1 || score >= 2) level = 1;

  f.sort((a, b) => b.sev - a.sev);
  return { level, label: LEVELS[level], score, findings: f };
}

module.exports = { triage, LEVELS };
