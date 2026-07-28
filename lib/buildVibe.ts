import { getManyTrackTags, getSimilarTracks, getTracksByTag, getTrackTags } from "./lastfm";
import { getManyTrackAssets, getTrackAssets } from "./itunes";
import { curateRecommendations, CurationCandidate } from "./groq";
import { classifyTags } from "./genre";
import { computeTagWeights, scoreOverlap } from "./tagTrust";
import { estimateBpm, bpmDistance, BpmEstimate } from "./bpm";
import { Recommendation, VibeResult } from "./types";

const FALLBACK_TAGS = new Set(["discovery"]); // placeholder tags with nothing real to search by

// How many "similar"-pool candidates get a real Last.fm tag lookup before
// curation, so Groq can genre-check them instead of guessing from the name
// alone. Bounded because it's one extra request per track.
const SIMILAR_TAG_LOOKUP_CAP = 20;

function candidateKey(artist: string, track: string): string {
  return `${artist.toLowerCase()}::${track.toLowerCase()}`;
}

/** Merges Last.fm's two candidate sources into one deduped pool:
 * - track.getSimilar: collaborative filtering, biased toward the seed's own artist
 * - tag.getTopTracks (genre tags first, falling back to mood tags): other
 *   artists sharing the seed's mood/genre tags, tagged with the query that found them
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
  seen.add(candidateKey(artist, track));

  // similar-pool candidates don't carry tags yet — look up the top slice
  // by match so curation can genre-check them against real data.
  const toLookUp = similar.slice(0, SIMILAR_TAG_LOOKUP_CAP);
  const rest = similar.slice(SIMILAR_TAG_LOOKUP_CAP);
  const tagged = await getManyTrackTags(toLookUp);

  const merged: CurationCandidate[] = [];
  for (const r of tagged) {
    const k = candidateKey(r.artist, r.track);
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push({ artist: r.artist, track: r.track, match: r.match, source: "similar", tags: r.tags });
  }
  for (const r of rest) {
    const k = candidateKey(r.artist, r.track);
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push({ artist: r.artist, track: r.track, match: r.match, source: "similar" });
  }
  for (let i = 0; i < tagPools.length; i++) {
    const queryTag = queryTags[i];
    for (const r of tagPools[i]) {
      const k = candidateKey(r.artist, r.track);
      if (seen.has(k)) continue;
      seen.add(k);
      merged.push({ artist: r.artist, track: r.track, match: r.match, source: "tag", tags: [queryTag] });
    }
  }
  return merged;
}

/** Attaches weighted tag-overlap and a genre-tag-derived BPM prior to every
 * candidate. The frequency corpus for the overlap weighting is the
 * candidate pool itself — there's no persistent tag index in this
 * stateless app to draw a true global frequency from (see tagTrust.ts).
 * Mutates in place; the array is already a fresh, request-scoped copy. */
function scoreCandidates(seedTags: string[], candidates: CurationCandidate[]): void {
  const weights = computeTagWeights(candidates);
  for (const c of candidates) {
    c.tagOverlap = scoreOverlap(seedTags, c.tags, weights);
    const candidateGenres = c.tags ? classifyTags(c.tags).genres : [];
    c.bpmEstimate = candidateGenres.length ? estimateBpm(candidateGenres) : null;
  }
}

/** Diversify-only fallback (no Groq available, or the curation call failed).
 * Ranking order: weighted tag-overlap tier first (the "shares 6 of the
 * seed's 7 tags" idea), then the weighted overlap score to break ties
 * within a tier, then BPM-range proximity to the seed as a last tiebreaker,
 * and only then the raw Last.fm match score. */
function fallbackRank(candidates: CurationCandidate[], seedBpm: BpmEstimate | null): CurationCandidate[] {
  const perArtist = new Map<string, number>();
  return candidates
    .slice()
    .sort((a, b) => {
      const tierA = a.tagOverlap?.tier ?? 0;
      const tierB = b.tagOverlap?.tier ?? 0;
      if (tierA !== tierB) return tierB - tierA;

      const scoreA = a.tagOverlap?.score ?? 0;
      const scoreB = b.tagOverlap?.score ?? 0;
      if (Math.abs(scoreA - scoreB) > 1e-6) return scoreB - scoreA;

      const distA = bpmDistance(seedBpm, a.bpmEstimate ?? null);
      const distB = bpmDistance(seedBpm, b.bpmEstimate ?? null);
      if (distA !== null && distB !== null && distA !== distB) return distA - distB;

      return b.match - a.match;
    })
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
 * queries preferred over mood), weighted tag-overlap + a genre-tag BPM
 * prior computed for every candidate, a Groq curation pass that reranks
 * that pool using genre as a near-hard constraint plus the two computed
 * signals as extra evidence — correcting both the same-artist bias of raw
 * collaborative filtering and the risk of genre drift — and writes the
 * seed blurb as a byproduct of that same call, then iTunes art/preview only
 * for the final picks. Shared by the direct song-search flow and the
 * mood-search flow so both end up with an identical, fully-hydrated
 * payload. */
export async function buildVibeResult(artist: string, track: string): Promise<VibeResult> {
  const [tags, seedAssets] = await Promise.all([getTrackTags(artist, track), getTrackAssets(artist, track)]);
  const { genres, moods } = classifyTags(tags);
  const seedBpm = estimateBpm(genres);

  const candidates = await gatherCandidates(artist, track, genres, moods);
  scoreCandidates(tags, candidates);
  const lookup = new Map(candidates.map((c) => [candidateKey(c.artist, c.track), c]));

  const curation = await curateRecommendations(artist, track, genres, moods, candidates, seedBpm);

  let ranked: (CurationCandidate & { why?: string })[];
  let blurb: string | null;

  if (curation) {
    ranked = curation.picks.map((p) => {
      const original = lookup.get(candidateKey(p.artist, p.track));
      return {
        artist: p.artist,
        track: p.track,
        match: 0,
        source: "similar" as const,
        why: p.why,
        tagOverlap: original?.tagOverlap,
        bpmEstimate: original?.bpmEstimate ?? null
      };
    });
    blurb = curation.blurb;
  } else {
    ranked = fallbackRank(candidates, seedBpm);
    blurb = null;
  }

  // Recompute match as a descending "fit score" for display — once Groq
  // reranks, the original Last.fm match/rank numbers no longer reflect
  // final order, so we derive a fresh one from curated position instead.
  const withScore = ranked.map((r, i) => ({
    ...r,
    match: curation ? Math.max(0.6, 0.97 - i * 0.02) : r.match
  }));

  const hydrated = await getManyTrackAssets(withScore);
  const recommendations: Recommendation[] = hydrated.map((r) => ({
    artist: r.artist,
    track: r.track,
    art: r.art,
    preview: r.preview,
    match: r.match,
    why: r.why,
    tagMatch: r.tagOverlap ? { tier: r.tagOverlap.tier, possible: r.tagOverlap.possible } : undefined,
    bpm: r.bpmEstimate ?? null
  }));

  return {
    seed: { artist, track, tags, ...seedAssets, bpm: seedBpm },
    blurb,
    recommendations
  };
}
