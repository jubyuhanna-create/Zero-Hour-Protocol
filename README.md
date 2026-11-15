# Zero Hour Protocol, crew health monitor

NASA Space Apps Challenge 2026 entry for **Create Health Monitoring Software for Astronauts on Space Missions**.

On the way to Mars an answer from Earth takes about 23 minutes. Zero Hour Protocol lets the crew check their own health, understand what is wrong and act on it, without waiting for the ground.

## What it does

- **Live monitor** for four crew members with ECG, pleth and respiration waveforms, heart rate, SpO₂, breathing rate, temperature, blood pressure, HRV, stress index and radiation dose rate.
- **AI triage** that scores vitals with NEWS2 bands after correcting for the current activity, detects irregular heart rhythm, and flags readings that are unusual for that specific person. Every finding explains why and says who should act: the crew onboard, the flight surgeon in the next report, or both right away.
- **Body check**: a clickable body map with what each part does, how space affects it, how it is measured onboard and what to do.
- **Daily check-in** for mood, sleep, blood sugar and symptoms, merged with sensor data.
- **Voice medic**: the astronaut speaks in any language. Gemini only turns speech into structured symptoms. The decision is made by the same triage rules and is checked against the sensors, then read back aloud.
- **Five hazards of human spaceflight** from NASA's Human Research Program: radiation, isolation, distance, gravity and the closed environment.
- **Since launch**: bone loss, lifetime dose, sleep and mood, projected to Mars arrival.
- **Correlated anomalies**: whole ship drills for a cabin oxygen drop and a CO₂ scrubber failure. When several crew change the same way at once, the system points to the shared air instead of blaming one body. For each person it shows which signals moved together and what pattern that matches. Sleeping crew are woken by alarms and lose sleep.
- **Live space weather from NASA DONKI**: solar flares and solar particle events of the last 7 days, an automatic shelter warning after a particle event, and a drill that replays the strongest real flare.
- **Readable under stress**: every status has its own shape (circle, diamond, triangle, octagon) as well as a color, and alarms have different sounds per priority.
- **Habit prompts**: routine items have times, and the app reminds the astronaut when one is due.
- **Mission locations**: space station, Mars transit, Moon base and Mars base, each with its measured background radiation, gravity, signal delay to Earth and the right escalation advice.
- **Works with no link to Earth**: install it as an app, it keeps running offline, and check-ins and events are saved on the device and sent when the link comes back.
- **Real crew data**: blood tests of the Inspiration4 crew from NASA OSDR (OSD-575). The triage runs on them and spots a likely sample handling problem when three crew show the same low glucose at one visit.
- **Training drills and a guided demo**: oxygen leak, arrhythmia, suit cooling failure, sleep loss, solar storm and storm shelter.
- **Downlink report** for the flight surgeon and CSV export of all telemetry.

## Architecture

```
 Wearable sensors                                Crew tablets and laptops (index.html)
        |  POST /api/telemetry + device key              |   check-ins, voice, events, polling
        v                                                v
 +--------------------------------- Vercel serverless API ---------------------------------+
 |  telemetry.js  triage on every reading, alerts to the event log                         |
 |  checkin.js    daily check-ins and voice reports                                        |
 |  events.js     shared mission log, every screen sees the same history                   |
 |  voice.js      speech to structured symptoms with Gemini, key stays on the server       |
 |  report.js     downlink report for the flight surgeon, built from the database          |
 |  health.js     which features are switched on                                           |
 +--------------------------------------------+--------------------------------------------+
                                              v
                        Supabase Postgres, row level security on, server access only
```

The page also works with no backend at all, on the simulator only, so the demo never breaks.

## API

| Method | Path | What it does |
|---|---|---|
| GET | `/api/health` | Database, voice and sensor upload status |
| POST | `/api/telemetry` | Sensor reading or batch of up to 50. Needs header `x-device-key`. Triaged and stored, warnings go to the event log |
| GET | `/api/telemetry?latest=1` | Newest reading per crew member from the last minute |
| GET | `/api/telemetry?crew=CDR&minutes=30` | History for one crew member |
| POST | `/api/checkin` | Mood, sleep, glucose, symptoms, pain |
| GET | `/api/checkin` and `?crew=FE&days=14` | Latest per crew, or history |
| GET, POST | `/api/events` and `?after=ID` | Shared event log with polling |
| POST | `/api/voice` | Audio or text in, structured symptoms out, saved as a voice report |
| GET | `/api/spaceweather` | Solar flares and particle events from NASA DONKI, cached 15 minutes |
| GET | `/api/report` | Plain text downlink report. `?format=json` for JSON |

Send a reading by hand:

```
curl -X POST https://YOUR-APP.vercel.app/api/telemetry \
  -H "Content-Type: application/json" -H "x-device-key: YOUR_DEVICE_KEY" \
  -d '{"crew_id":"PLT","hr":72,"spo2":98,"activity":"rest"}'
```

## Run it

Open `index.html` in a browser for the offline version: simulator, triage and a keyword based voice medic all work without a server.

## Deploy

1. Create a Supabase project. In SQL Editor run `supabase/schema.sql`.
2. Import this repository in Vercel. No build step is needed.
3. In Vercel, Settings, Environment Variables, add:
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from Supabase, Project Settings, API
   - `GEMINI_API_KEY` for the voice medic, optional `GEMINI_MODEL` (default `gemini-2.5-flash`)
   - `DEVICE_KEY`, any long random text, the password sensors use to upload
   - optional `NASA_API_KEY` from api.nasa.gov for space weather (the public DEMO_KEY is used otherwise)
4. Redeploy. The header shows "Ship database: Synced" when everything is connected.

All keys stay on the server. The browser never sees them.

On a real mission the speech model would run on the spacecraft, since there is no internet link to Mars.

## Data and sources

- Zeitlin et al., Measurements of energetic particle radiation in transit to Mars on the Mars Science Laboratory, Science 2013. 1.8 mSv per day in cruise.
- NASA-STD-3001, OCHMO radiation protection technical brief. 600 mSv career limit, 250 mSv per solar particle event.
- Lang et al., J Bone Miner Res 2004, and Axpe et al., PLoS ONE 2020. Bone loss rates in flight.
- Zhang et al., Science Advances 2020: 1369 µSv per day on the Moon, 731 µSv per day on the ISS. Hassler et al., Science 2014: 0.64 mSv per day on the Mars surface.
- Royal College of Physicians, NEWS2, 2017. Early warning score bands.
- IEC 60601-1-8. Medical alarm colors.
- NASA DONKI space weather database, Community Coordinated Modeling Center, through api.nasa.gov.
- NASA Open Science Data Repository, OSD-575, LSDS-8 Comprehensive Metabolic Panel, Inspiration4 crew. Overbey et al., npj Microgravity 2024.
- NASA Human Research Program, five hazards of human spaceflight and SANS.

Live vitals are simulated. Inspiration4 blood results are real. Not a medical device.

## Use of AI

Code was written with help from Claude by Anthropic. Gemini by Google is used at runtime to transcribe speech and extract symptoms.

## Team

Zero Hour Protocol
