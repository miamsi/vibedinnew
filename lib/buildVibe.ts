import { getSimilarTracks, getTracksByTag, getTrackTags } from "./lastfm";
import { getManyTrackAssets, getTrackAssets } from "./itunes";
import { curateRecommendations, CurationCandidate } from "./groq";
import { Recommendation, VibeResult } from "./types";

const FALLBACK_TAGS = new Set(["discovery"]); // placeholder tags with nothing real to search by

/** Merges Last.fm's two candidate sources into one deduped pool:
 * - track.getSimilar: collaborative filtering, biased toward the seed's own artist
 * - tag.getTopTracks (top 2 seed tags): other artists sharing the same mood/genre
 * Excludes the seed track itself. */
async function gatherCandidates(
  artist: string,
  track: string,
  tags: string[]
): Promise<CurationCandidate[]> {
  const searchTags = tags.filter((t) => !FALLBACK_TAGS.has(t)).slice(0, 2);

  const [similar, ...tagPools] = await Promise.all([
    getSimilarTracks(artist, track),
    ...searchTags.map((t) => getTracksByTag(t))
  ]);

  const seen = new Set<string>();
  const key = (a: string, t: string) => `${a.toLowerCase()}::${t.toLowerCase()}`;
  seen.add(key(artist, track));

  const merged: CurationCandidate[] = [];
  for (const r of similar) {
    const k = key(r.artist, r.track);
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push({ artist: r.artist, track: r.track, match: r.match, source: "similar" });
  }
  for (const pool of tagPools) {
    for (const r of pool) {
      const k = key(r.artist, r.track);
      if (seen.has(k)) continue;
      seen.add(k);
      merged.push({ artist: r.artist, track: r.track, match: r.match, source: "tag" });
    }
  }
  return merged;
}

/** Diversify-only fallback (no Groq available, or the curation call failed):
 * same behavior as before — sorted by match, capped at 2 per artist. */
function fallbackRank(candidates: CurationCandidate[]): CurationCandidate[] {
  const perArtist = new Map<string, number>();
  return candidates
    .sort((a, b) => b.match - a.match)
    .filter((c) => {
      const count = perArtist.get(c.artist.toLowerCase()) ?? 0;
      if (count >= 2) return false;
      perArtist.set(c.artist.toLowerCase(), count + 1);
      return true;
    })
    .slice(0, 16);
}

/** The full pipeline for one seed track: tags + assets, a merged candidate
 * pool from two Last.fm sources, a Groq curation pass that reranks that
 * pool for actual vibe fit (correcting the same-artist bias of raw
 * collaborative filtering) and writes the seed blurb as a byproduct of
 * that same call, then iTunes art/preview only for the final picks.
 * Shared by the direct song-search flow and the mood-search flow so both
 * end up with an identical, fully-hydrated payload. */
export async function buildVibeResult(artist: string, track: string): Promise<VibeResult> {
  const [tags, seedAssets] = await Promise.all([getTrackTags(artist, track), getTrackAssets(artist, track)]);

  const candidates = await gatherCandidates(artist, track, tags);
  const curation = await curateRecommendations(artist, track, tags, candidates);

  let ranked: (CurationCandidate & { why?: string })[];
  let blurb: string | null;

  if (curation) {
    ranked = curation.picks.map((p) => ({ ...p, match: 0, source: "similar" as const, why: p.why }));
    blurb = curation.blurb;
  } else {
    ranked = fallbackRank(candidates);
    blurb = null;
  }

  // Recompute match as a descending "fit score" for display — once Groq
  // reranks, the original Last.fm match/rank numbers no longer reflect
  // final order, so we derive a fresh one from curated position instead.
  const withScore = ranked.map((r, i) => ({
    ...r,
    match: curation ? Math.max(0.6, 0.97 - i * 0.02) : r.match
  }));

  const recommendations: Recommendation[] = await getManyTrackAssets(withScore);

  return {
    seed: { artist, track, tags, ...seedAssets },
    blurb,
    recommendations
  };
}
