import { Recommendation, SearchSuggestion } from "./types";

const BASE_URL = "https://ws.audioscrobbler.com/2.0/";
const MATCH_THRESHOLD = 0.4;

function apiKey(): string {
  const key = process.env.LASTFM_API_KEY;
  if (!key) throw new Error("LASTFM_API_KEY is not configured on the server.");
  return key;
}

async function lfmGet(params: Record<string, string>) {
  const url = new URL(BASE_URL);
  url.searchParams.set("api_key", apiKey());
  url.searchParams.set("format", "json");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Last.fm request failed (${res.status})`);
  const data = await res.json();
  if (data.error) throw new Error(data.message || "Last.fm returned an error");
  return data;
}

export async function searchTracks(query: string): Promise<SearchSuggestion[]> {
  if (!query || query.trim().length < 2) return [];
  const data = await lfmGet({ method: "track.search", track: query, limit: "8" });
  const tracks = data?.results?.trackmatches?.track ?? [];
  const list = Array.isArray(tracks) ? tracks : [tracks];
  return list
    .filter((t: any) => t?.name && t?.artist)
    .map((t: any) => ({ artist: t.artist, track: t.name }));
}

export async function getTrackTags(artist: string, track: string): Promise<string[]> {
  try {
    const data = await lfmGet({ method: "track.getInfo", artist, track });
    const raw = data?.track?.toptags?.tag ?? [];
    const list = Array.isArray(raw) ? raw : [raw];
    const tags = list.map((t: any) => t?.name).filter(Boolean);
    return tags.length ? tags.slice(0, 6) : ["discovery"];
  } catch {
    return ["discovery"];
  }
}

/** Confirms Last.fm actually knows this artist/track pair. Used to validate
 * Groq's mood-based song suggestions before we build a page around them. */
export async function trackExists(artist: string, track: string): Promise<boolean> {
  try {
    const data = await lfmGet({ method: "track.getInfo", artist, track });
    return Boolean(data?.track?.name);
  } catch {
    return false;
  }
}

export async function getSimilarTracks(artist: string, track: string): Promise<Recommendation[]> {
  try {
    const data = await lfmGet({ method: "track.getSimilar", artist, track, limit: "100" });
    const raw = data?.similartracks?.track ?? [];
    const list = Array.isArray(raw) ? raw : [raw];

    const results: Recommendation[] = [];
    for (const t of list) {
      const score = parseFloat(t?.match ?? "0");
      if (score >= MATCH_THRESHOLD && t?.name && t?.artist?.name) {
        results.push({
          track: t.name,
          artist: t.artist.name,
          match: score,
          art: null,
          preview: null
        });
      }
    }

    // Diversify: cap each artist at 2 appearances so the grid isn't one
    // artist's discography, then keep it sorted by match strength.
    const perArtist = new Map<string, number>();
    const diversified = results
      .sort((a, b) => b.match - a.match)
      .filter((r) => {
        const count = perArtist.get(r.artist.toLowerCase()) ?? 0;
        if (count >= 2) return false;
        perArtist.set(r.artist.toLowerCase(), count + 1);
        return true;
      });

    return diversified.slice(0, 16);
  } catch {
    return [];
  }
}
