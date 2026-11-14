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
- **Real crew data**: blood tests of the Inspiration4 crew from NASA OSDR (OSD-575). The triage runs on them and spots a likely sample handling problem when three crew show the same low glucose at one visit.
- **Training drills and a guided demo**: oxygen leak, arrhythmia, suit cooling failure, sleep loss, solar storm and storm shelter.
- **Downlink report** for the flight surgeon and CSV export of all telemetry.

## Run it

Open `index.html` in a browser. Everything works offline except the voice medic, which falls back to a local keyword parser.

## Deploy on Vercel with voice

1. Import this repository in Vercel. No build step is needed.
2. In Project Settings, Environment Variables, add `GEMINI_API_KEY`. Optional: `GEMINI_MODEL` (default `gemini-2.5-flash`).
3. Deploy. `api/voice.js` keeps the key on the server, so it never reaches the browser.

On a real mission the speech model would run on the spacecraft, since there is no internet link to Mars.

## Data and sources

- Zeitlin et al., Measurements of energetic particle radiation in transit to Mars on the Mars Science Laboratory, Science 2013. 1.8 mSv per day in cruise.
- NASA-STD-3001, OCHMO radiation protection technical brief. 600 mSv career limit, 250 mSv per solar particle event.
- Lang et al., J Bone Miner Res 2004, and Axpe et al., PLoS ONE 2020. Bone loss rates in flight.
- Royal College of Physicians, NEWS2, 2017. Early warning score bands.
- IEC 60601-1-8. Medical alarm colors.
- NASA Open Science Data Repository, OSD-575, LSDS-8 Comprehensive Metabolic Panel, Inspiration4 crew. Overbey et al., npj Microgravity 2024.
- NASA Human Research Program, five hazards of human spaceflight and SANS.

Live vitals are simulated. Inspiration4 blood results are real. Not a medical device.

## Use of AI

Code was written with help from Claude by Anthropic. Gemini by Google is used at runtime to transcribe speech and extract symptoms.

## Team

Zero Hour Protocol
