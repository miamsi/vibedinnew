const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Groq deprecated the old llama-3.1-8b-instant / llama-3.3-70b-versatile
// line in mid-2026. These are the current recommended replacements, kept
// behind env vars so a redeploy never needs a code change if Groq's
// lineup shifts again — see console.groq.com/docs/models for the live list.
const FAST_MODEL = process.env.GROQ_MODEL_FAST || "openai/gpt-oss-20b";
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

/** One warm, specific sentence describing the vibe of a matched track,
 * used as a small delight under the hero. Never blocks the page if it fails. */
export async function generateVibeBlurb(
  artist: string,
  track: string,
  tags: string[]
): Promise<string | null> {
  const result = await chatJSON(
    FAST_MODEL,
    `You are a sharp, warm music curator writing a one-sentence "vibe note" for a listener.
Respond ONLY with JSON: {"blurb": string}.
The blurb must be a single sentence, under 22 words, evocative but not cheesy, no emoji, no quotation marks around song names.`,
    `Track: "${track}" by ${artist}. Mood tags: ${tags.join(", ")}.`
  );
  return typeof result?.blurb === "string" ? result.blurb : null;
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
