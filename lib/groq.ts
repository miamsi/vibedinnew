const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Groq deprecated the old llama-3.1-8b-instant / llama-3.3-70b-versatile
// line in mid-2026. These are the current recommended replacements, kept
// behind env vars so a redeploy never needs a code change if Groq's
// lineup shifts again — see console.groq.com/docs/models for the live list.
const SMART_MODEL = process.env.GROQ_MODEL_SMART || "openai/gpt-oss-120b";

export function hasGroq(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

async function chatJSON(model: string, system: string, user: string): Promise<any | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 500
      }),
      // Keep the UI snappy: a slow/rate-limited Groq call should never
      // block the core Last.fm + iTunes result.
      signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) return null;
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export type CurationCandidate = { artist: string; track: string; match: number; source: "similar" | "tag" };
export type CuratedPick = { artist: string; track: string; why: string };
export type CurationResult = { blurb: string | null; picks: CuratedPick[] };

/** The core recommendation step: takes a merged pool of candidates pulled
 * from Last.fm (track.getSimilar, which is collaborative-filtering and
 * skews toward the seed's own artist, PLUS tag.getTopTracks, which surfaces
 * other artists sharing the same mood/genre tags) and asks the model to
 * pick and reorder the ones that actually match the seed's vibe — texture,
 * mood, era, production — rather than just "same artist" or raw popularity.
 * The one-line "why" per pick and the seed blurb are a free byproduct of
 * this same call, so we're not spending a second round-trip on copywriting.
 * Returns null on any failure so the caller can fall back to the raw
 * Last.fm ranking. */
export async function curateRecommendations(
  seedArtist: string,
  seedTrack: string,
  seedTags: string[],
  candidates: CurationCandidate[]
): Promise<CurationResult | null> {
  if (!candidates.length) return null;

  const list = candidates
    .map(
      (c, i) =>
        `${i}. "${c.track}" — ${c.artist} [source: ${c.source}${c.source === "similar" ? `, lastfm match ${c.match.toFixed(2)}` : ""}]`
    )
    .join("\n");

  const result = await chatJSON(
    SMART_MODEL,
    `You are a music curator who understands VIBE — mood, energy, texture, era, production style — not just genre labels or "people who scrobbled A also scrobbled B" collaborative filtering.

You'll get a seed track and a numbered pool of candidates pulled from two Last.fm sources:
- "similar": track.getSimilar, a collaborative-filtering endpoint that is heavily biased toward the seed's OWN artist and raw popularity, not actual vibe.
- "tag": tag.getTopTracks, tracks sharing the seed's mood/genre tags, spanning many different artists.

Your job: pick and reorder candidates so the final list actually captures the seed's vibe, while correcting for the "similar" pool's same-artist bias.

Rules:
- Pick exactly 16 candidates (fewer only if the pool has fewer than 16 real options), ordered best-first.
- No more than 2 picks by the same artist, total.
- Weight vibe fit over raw match score or source — a great "tag" candidate should often outrank a mediocre "similar" one.
- Reference candidates ONLY by their index number from the list given; never invent new tracks.
- For each pick, give a short reason (under 12 words) naming the specific vibe link (mood, texture, era, instrumentation) — not just "same genre".
- Also write one warm, specific sentence (under 22 words) describing the seed track's own vibe, no emoji, no quotation marks around song names.

Respond ONLY with JSON:
{"blurb": string, "picks": [{"index": number, "why": string}, ...]}`,
    `Seed: "${seedTrack}" by ${seedArtist}. Seed mood tags: ${seedTags.join(", ")}.

Candidates:
${list}`
  );

  const rawPicks = result?.picks;
  if (!Array.isArray(rawPicks)) return null;

  const seen = new Set<number>();
  const picks: CuratedPick[] = [];
  for (const p of rawPicks) {
    const idx = Number(p?.index);
    if (!Number.isInteger(idx) || idx < 0 || idx >= candidates.length || seen.has(idx)) continue;
    seen.add(idx);
    const c = candidates[idx];
    picks.push({ artist: c.artist, track: c.track, why: typeof p?.why === "string" ? p.why : "" });
  }
  if (!picks.length) return null;

  return { blurb: typeof result?.blurb === "string" ? result.blurb : null, picks: picks.slice(0, 16) };
}

/** Turns a free-text mood description ("rainy sunday, slow acoustic") into
 * a shortlist of real (artist, track) seeds. The caller validates each
 * against Last.fm and uses the first one that actually exists. */
export async function suggestSeedsFromMood(description: string): Promise<{ artist: string; track: string }[]> {
  const result = await chatJSON(
    SMART_MODEL,
    `You are a music expert with encyclopedic knowledge of real, released songs.
Given a mood/vibe description, respond ONLY with JSON:
{"seeds": [{"artist": string, "track": string}, ...]}
Return exactly 5 real songs (with correct, exact official artist and track names) that strongly match the described mood. Prefer well-known tracks that are likely to exist on Last.fm. Do not invent songs.`,
    `Mood: ${description}`
  );

  const seeds = result?.seeds;
  if (!Array.isArray(seeds)) return [];
  return seeds
    .filter((s: any) => s?.artist && s?.track)
    .map((s: any) => ({ artist: String(s.artist), track: String(s.track) }))
    .slice(0, 5);
}
