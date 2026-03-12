# ClipForge AI — TikTok Shop Video Editor

An AI video editing tool that analyzes your raw footage and generates polished TikTok Shop videos in 4 style variants.

---

## Stack

- **Next.js 15** (App Router)
- **Gemini 1.5 Pro** — watches your raw footage, identifies scenes and best moments
- **Claude Opus** — writes 4 precise edit variants with cut timestamps + captions
- **Creatomate** — renders the final 1080x1920 TikTok-ready video
- **Supabase** — auth + storage (optional, runs in demo mode without it)

---

## Quick start

```bash
git clone https://github.com/your-username/clipforge-ai
cd clipforge-ai
npm install
cp .env.example .env.local
# Fill in your API keys (see below)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Demo mode:** Without any env vars, the app runs fully with mock data. Every page works. Add API keys progressively to unlock real AI generation.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | For AI edits | Claude generates the 4 edit variants |
| `GEMINI_API_KEY` | For AI analysis | Gemini analyzes your footage |
| `CREATOMATE_API_KEY` | For rendering | Renders the final video |
| `NEXT_PUBLIC_SUPABASE_URL` | For auth | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For auth | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | For storage | Supabase service role key |

---

## Supabase setup (optional)

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/migrations/001_init.sql` in your SQL Editor
3. Create a storage bucket called `raw-footage` (set to **public**)
4. Add the 3 Supabase env vars to Vercel

---

## Deploy to Vercel

1. Push to GitHub
2. Import repo in [vercel.com](https://vercel.com)
3. Add env vars in Vercel project settings
4. Deploy — the `vercel.json` sets the 300s timeout for video processing

---

## How it works

```
Upload raw footage (MP4/MOV/AVI)
       ↓
Gemini 1.5 Pro watches video → scene analysis + transcript
       ↓
Claude writes 4 edit variants (A/B/C/D)
with precise cut timestamps + captions
       ↓
Video uploaded to Supabase Storage (or Creatomate)
       ↓
Creatomate renders 1080×1920 TikTok video
       ↓
Preview + download finished clip
```
