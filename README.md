# CIPACA AI Voice Assistant

Production-quality AI-powered hospital voice assistant for **CIPACA Hospital**. Runs entirely in the browser using your microphone — no Twilio or phone integration required.

## Features

- **Demo Mode (free)** — works with zero API keys using a built-in rule-based hospital assistant
- **OpenAI Realtime API** for low-latency voice when `OPENAI_API_KEY` is configured
- **Graceful fallback** to Web Speech API + built-in assistant + browser TTS
- **Emergency detection** with red alert banner, ticket generation, and escalation simulation
- **Appointment requests** with structured data capture and reference IDs
- **Tamil + English** bilingual support
- **Admin dashboard** with stats, charts, search, filters — data stored in browser localStorage
- **Dark + Light mode** with modern SaaS UI

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- TailwindCSS + shadcn/ui
- Zustand + localStorage persistence
- OpenAI SDK (optional)
- Recharts

---

## Free Deployment (Vercel Hobby)

This project is designed to deploy on the **free Vercel Hobby plan** with **no paid services required**.

### What works without any API keys

| Feature | Demo Mode |
|---------|-----------|
| Voice input (STT) | Browser Web Speech API |
| Voice output (TTS) | Browser `speechSynthesis` |
| Appointment booking | Built-in rule-based assistant |
| Emergency handling | Built-in rule-based assistant |
| General FAQ | Built-in rule-based assistant |
| Tamil + English | Yes |
| Dashboard | Yes (localStorage) |
| Leads / notifications | Browser localStorage |

When `OPENAI_API_KEY` is **not** set, the app automatically runs in **Demo Mode** and shows a **Demo Mode** badge. No errors are shown.

When `OPENAI_API_KEY` **is** set, the app uses OpenAI Realtime / GPT / TTS for enhanced AI responses.

### Deploy steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Import on Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Framework: **Next.js** (auto-detected)
   - Build command: `npm run build`
   - No extra configuration needed

3. **Environment variables (optional)**
   | Variable | Required | Description |
   |----------|----------|-------------|
   | `OPENAI_API_KEY` | No | Enables full AI mode. Omit for free Demo Mode. |

4. **Deploy** — click Deploy. The app works immediately in Demo Mode.

### Local development

```bash
npm install
cp .env.example .env.local   # optional — leave OPENAI_API_KEY blank for Demo Mode
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/voice` | Voice assistant |
| `/dashboard` | Admin dashboard |
| `/gre` | GRE team management |
| `/knowledge` | Knowledge base admin |
| `/training` | AI training module |
| `/pilot` | Pilot rollout |

---

## Demo Mode Assistant

The built-in assistant uses rule-based conversation state (not OpenAI) and supports:

- **Appointments** — "I want an appointment", "book appointment", "need doctor", "scan booking"
- **Emergency** — "emergency", "accident", "trauma", "ambulance"
- **General FAQ** — visiting hours, hospital services, departments
- **Tamil + English** — language persists for the session

Conversation state is preserved across messages. Data is saved to browser localStorage.

---

## Voice Pipeline

### With OpenAI API key
WebRTC Realtime → fallback to SpeechRecognition + GPT + TTS if unavailable

### Demo Mode (no API key)
1. Browser `SpeechRecognition` for speech-to-text
2. Built-in rule-based assistant for responses
3. Browser `speechSynthesis` for text-to-speech

---

## Data Storage

All dashboard data (leads, appointments, notifications, conversation history) is stored in **browser localStorage**. No server-side database is required.

On Vercel, the serverless filesystem is read-only — server actions return data to the client, which persists it locally.

> For production persistence across devices, connect [Vercel Postgres](https://vercel.com/storage/postgres) or similar and update `lib/storage.ts`.

---

## Build

```bash
npm install
npm run lint
npm run build
npm start
```

---

## Browser Requirements

- Chrome, Edge, or Safari (latest)
- Microphone permission
- HTTPS in production (Vercel provides this automatically)

---

## License

Private — CIPACA Hospital
