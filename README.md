# Vibedin 🌊

Drop in a song you're obsessed with, or describe a mood, and Vibedin reads the
track's sonic DNA (Last.fm tags) and finds what to play next — with artwork
and 30-second previews pulled from iTunes.

Rebuilt from the original Streamlit app as a Next.js 15 (App Router,
TypeScript) app so it can deploy to **Vercel** natively or to any
**Docker host — including SnapDeploy** — via the included `Dockerfile`.

## Features

- **By song** — type-ahead search (Last.fm) with debounced autocomplete.
- **By mood** *(optional, needs a Groq key)* — describe a vibe in plain
  English ("rainy sunday, slow acoustic") and an LLM suggests real songs,
  each validated against Last.fm before use.
- A short Groq-written "vibe note" for the matched track.
- Recommendations deduped so no single artist dominates the grid.
- Dynamic ambient background that shifts color to match the track's mood.
- Only one audio preview plays at a time.
- All API keys stay server-side — never shipped to the browser.

## 1. Get your API keys

| Key | Required? | Where to get it |
|---|---|---|
| `LASTFM_API_KEY` | Yes | [last.fm/api/account/create](https://www.last.fm/api/account/create) (free, instant) |
| `GROQ_API_KEY` | No — enables "By mood" search + vibe notes | [console.groq.com/keys](https://console.groq.com/keys) (free tier) |

Without a Groq key, the app runs fully in "By song" mode; the mood tab just
explains that it needs a key.

## 2. Run it locally

```bash
npm install
cp .env.example .env.local   # then fill in your keys
npm run dev
```

Open http://localhost:3000.

## 3. Deploy to Vercel (recommended, easiest)

1. Push this folder to a GitHub repo.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
   Next.js is auto-detected — no build settings to change.
3. Under **Environment Variables**, add `LASTFM_API_KEY` (and
   `GROQ_API_KEY` if you have one).
4. Deploy. Vercel's free Hobby tier covers this comfortably.

## 4. Deploy to SnapDeploy

SnapDeploy is a Docker-native host with a free tier (10 deploys/day,
auto-sleep/wake, no credit card). This repo includes a production
`Dockerfile` using Next.js's `standalone` output, so the image stays small.

1. Push this folder to a GitHub repo.
2. In the SnapDeploy dashboard, **Deploy from GitHub** and pick the repo.
   It will detect the `Dockerfile` and build from it directly (skips their
   auto-generation step).
3. Add `LASTFM_API_KEY` (and optionally `GROQ_API_KEY`) as environment
   variables for the container in the SnapDeploy dashboard.
4. Deploy. The container listens on port `3000`, which SnapDeploy's port
   auto-detection picks up automatically.

You can also build and push the image yourself if you'd rather deploy from a
registry instead of GitHub:

```bash
docker build -t vibedin .
docker run -p 3000:3000 -e LASTFM_API_KEY=xxx -e GROQ_API_KEY=xxx vibedin
```

## Project structure

```
app/
  page.tsx              entry point
  layout.tsx             fonts + metadata
  api/
    search/route.ts      Last.fm autocomplete
    vibe/route.ts         song mode — full pipeline
    vibe-search/route.ts  mood mode — Groq seed + full pipeline
components/               UI (SearchPanel, TrackHero, RecommendationGrid, …)
lib/
  lastfm.ts, itunes.ts, groq.ts   API wrappers
  buildVibe.ts           shared pipeline used by both /api/vibe routes
  vibes.ts               tag → color theme map
```

## Notes

- Groq deprecated its old `llama-3.1-8b-instant` / `llama-3.3-70b-versatile`
  models in mid-2026. This app defaults to their current replacements
  (`openai/gpt-oss-20b` and `openai/gpt-oss-120b`) via `GROQ_MODEL_FAST` /
  `GROQ_MODEL_SMART` env vars, so you can swap models without touching code
  if Groq's lineup changes again — check
  [console.groq.com/docs/models](https://console.groq.com/docs/models).
- The iTunes Search API is unauthenticated and rate-sensitive; asset lookups
  for recommendations run with limited concurrency to stay polite.
