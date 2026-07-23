import { getManyTrackTags, getSimilarTracks, getTracksByTag, getTrackTags } from "./lastfm";
import { getManyTrackAssets, getTrackAssets } from "./itunes";
import { curateRecommendations, CurationCandidate } from "./groq";
import { classifyTags } from "./genre";
import { Recommendation, VibeResult } from "./types";

const FALLBACK_TAGS = new Set(["discovery"]); // placeholder tags with nothing real to search by

// How many "similar"-pool candidates get a real Last.fm tag lookup before
// curation, so Groq can genre-check them instead of guessing from the name
// alone. Bounded because it's one extra request per track.
const SIMILAR_TAG_LOOKUP_CAP = 20;

/** Merges Last.fm's two candidate sources into one deduped pool:
 * - track.getSimilar: collaborative filtering, biased toward the seed's own artist
 * - tag.getTopTracks (genre tags first, falling back to mood tags): other
 *   artists sharing the seed's genre/mood, tagged with the query that found them
 * Excludes the seed track itself. Fetches real tags for the top "similar"
 * candidates too, so genre-checking during curation isn't done blind. */
async function gatherCandidates(
  artist: string,
  track: string,
  genres: string[],
  moods: string[]
): Promise<CurationCandidate[]> {
  // Prefer genre tags for widening the pool — that's the axis we want to
  // stay locked to. Only fall back to mood tags if the track has no
  // recognized genre tag at all.
  const queryTags = (genres.length ? genres : moods).filter((t) => !FALLBACK_TAGS.has(t)).slice(0, 2);

  const [similar, ...tagPools] = await Promise.all([
    getSimilarTracks(artist, track),
    ...queryTags.map((t) => getTracksByTag(t))
  ]);

  const seen = new Set<string>();
  const key = (a: string, t: string) => `${a.toLowerCase()}::${t.toLowerCase()}`;
  seen.add(key(artist, track));

  // similar-pool candidates don't carry tags yet — look up the top slice
  // by match so curation can genre-check them against real data.
  const toLookUp = similar.slice(0, SIMILAR_TAG_LOOKUP_CAP);
  const rest = similar.slice(SIMILAR_TAG_LOOKUP_CAP);
  const tagged = await getManyTrackTags(toLookUp);

  const merged: CurationCandidate[] = [];
  for (const r of tagged) {
    const k = key(r.artist, r.track);
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push({ artist: r.artist, track: r.track, match: r.match, source: "similar", tags: r.tags });
  }
  for (const r of rest) {
    const k = key(r.artist, r.track);
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push({ artist: r.artist, track: r.track, match: r.match, source: "similar" });
  }
  for (let i = 0; i < tagPools.length; i++) {
    const queryTag = queryTags[i];
    for (const r of tagPools[i]) {
      const k = key(r.artist, r.track);
      if (seen.has(k)) continue;
      seen.add(k);
      merged.push({ artist: r.artist, track: r.track, match: r.match, source: "tag", tags: [queryTag] });
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

/** The full pipeline for one seed track: tags (split into genre vs mood) +
 * assets, a merged candidate pool from two Last.fm sources (genre-tag
 * queries preferred over mood), a Groq curation pass that reranks that pool
 * with genre treated as a near-hard constraint and mood as a refinement
 * within it — correcting both the same-artist bias of raw collaborative
 * filtering and the risk of genre drift — and writes the seed blurb as a
 * byproduct of that same call, then iTunes art/preview only for the final
 * picks. Shared by the direct song-search flow and the mood-search flow so
 * both end up with an identical, fully-hydrated payload. */
export async function buildVibeResult(artist: string, track: string): Promise<VibeResult> {
  const [tags, seedAssets] = await Promise.all([getTrackTags(artist, track), getTrackAssets(artist, track)]);
  const { genres, moods } = classifyTags(tags);

  const candidates = await gatherCandidates(artist, track, genres, moods);
  const curation = await curateRecommendations(artist, track, genres, moods, candidates);

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
