import { normalize } from "./genre";

/** A full offline Tag Trust Score — entropy, co-occurrence, neighbor
 * consensus, computed against a persistent corpus of tags across millions
 * of tracks — needs a background indexing pipeline and a database this app
 * doesn't have. What's practical inside a single stateless request is
 * narrower but still real: weight each tag by how rare it is *within the
 * candidate pool we already fetched* (inverse document frequency), so a
 * tag nearly every candidate shares (e.g. "rock") barely counts, while a
 * tag only a few candidates share is treated as strong evidence. */

export type TagWeights = Map<string, number>;

export function computeTagWeights(pool: { tags?: string[] }[]): TagWeights {
  const df = new Map<string, number>();
  for (const c of pool) {
    const seen = new Set((c.tags ?? []).map(normalize));
    for (const t of seen) df.set(t, (df.get(t) ?? 0) + 1);
  }

  const n = Math.max(pool.length, 1);
  const weights: TagWeights = new Map();
  for (const [tag, count] of df) {
    // Classic IDF, floored so a tag present in literally every candidate
    // still contributes a small amount rather than dropping to zero.
    weights.set(tag, Math.max(0.05, Math.log((n + 1) / count)));
  }
  return weights;
}

const DEFAULT_WEIGHT = 0.3; // for a seed tag that never shows up anywhere in the candidate pool

export type TagOverlap = {
  /** exact count of seed tags this candidate also has — the "6 of 7" tier */
  tier: number;
  possible: number;
  /** weighted 0..1 score used to rank within a tier */
  score: number;
};

export function scoreOverlap(seedTags: string[], candidateTags: string[] | undefined, weights: TagWeights): TagOverlap {
  const seedSet = new Set(seedTags.map(normalize));
  const candSet = new Set((candidateTags ?? []).map(normalize));

  let tier = 0;
  let matchedWeight = 0;
  let totalWeight = 0;

  for (const t of seedSet) {
    const w = weights.get(t) ?? DEFAULT_WEIGHT;
    totalWeight += w;
    if (candSet.has(t)) {
      tier += 1;
      matchedWeight += w;
    }
  }

  return {
    tier,
    possible: seedSet.size,
    score: totalWeight > 0 ? matchedWeight / totalWeight : 0
  };
}
