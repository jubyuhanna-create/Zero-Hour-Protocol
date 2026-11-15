// Use of AI: much of this code was written with Claude by Anthropic, guided and tested by the Zero Hour Protocol team.
// Vercel serverless function: turns speech or text into structured symptoms with Gemini.
// The API key stays on the server (Vercel env var GEMINI_API_KEY). It never reaches the browser.
// The model only listens and extracts. All medical decisions are made by the triage rules in index.html.

const db = require('./_lib/db');
const { save } = require('./checkin');

const KEYS = ['chest','breath','vision','dizzy','headache','nausea','back','flank','abdomen','limb','fatigue','anxious'];

const PROMPT = `You are the speech front end of a health monitor used by astronauts on a long space mission.
The astronaut describes how they feel, in any language (often English, Arabic or Hebrew).
1. Write the transcript in the original language.
2. List only symptoms the astronaut actually said, using these keys:
chest = chest pain or pressure; breath = short of breath; vision = blurry or changed vision; dizzy = dizziness or feeling faint;
headache = headache; nausea = nausea or vomiting; back = back pain; flank = pain in the side or lower back near the kidneys;
abdomen = belly pain; limb = pain in an arm, leg or joint; fatigue = exhaustion; anxious = anxiety, panic or stress.
3. pain_score: the 0 to 10 pain number if they said one, otherwise -1.
4. pain_location: a few English words for where it hurts, or an empty string.
Do not diagnose and do not give advice. Do not add symptoms that were not said.`;

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    transcript: { type: 'STRING' },
    symptoms: { type: 'ARRAY', items: { type: 'STRING', enum: KEYS } },
    pain_score: { type: 'INTEGER' },
    pain_location: { type: 'STRING' }
  },
  required: ['transcript', 'symptoms', 'pain_score', 'pain_location']
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: 'GEMINI_API_KEY is not set' });

  const { audio, mime, text, crew_id } = req.body || {};
  const parts = [];
  if (audio) {
    if (audio.length > 3_000_000) return res.status(413).json({ error: 'Recording too long' });
    parts.push({ inline_data: { mime_type: mime || 'audio/wav', data: audio } });
  } else if (typeof text === 'string' && text.trim()) {
    parts.push({ text: 'The astronaut typed: ' + text.slice(0, 1000) });
  } else {
    return res.status(400).json({ error: 'Send audio or text' });
  }
  parts.push({ text: PROMPT });

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0 }
      })
    });
    const j = await r.json();
    if (!r.ok) return res.status(502).json({ error: j.error?.message || 'Gemini error' });
    const out = JSON.parse(j.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
    out.symptoms = (out.symptoms || []).filter(k => KEYS.includes(k));
    // Keep the report in the crew record so the flight surgeon sees it in the downlink.
    if (crew_id && db.ready()) {
      try {
        const saved = await save({ crew_id, source: 'voice', symptoms: out.symptoms, pain_score: out.pain_score >= 0 ? out.pain_score : null, pain_location: out.pain_location, transcript: out.transcript });
        out.saved_id = saved.id;
      } catch (e) { console.error(e); }
    }
    return res.status(200).json(out);
  } catch (e) {
    return res.status(502).json({ error: 'Could not reach Gemini' });
  }
};
