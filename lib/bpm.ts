import { normalize } from "./genre";

/** Last.fm gives us no tempo data at all — the API simply doesn't expose it,
 * and there's no reliable way to derive real BPM from tags, play counts, or
 * similarity scores alone. What follows is NOT a measurement. It's a prior:
 * a rough tempo range conventionally associated with each genre tag, drawn
 * from common DJ/production usage. Treat every estimate here as
 * low-confidence scaffolding for tie-breaking recommendations, never as a
 * fact to display as if it were measured. Genres with too much internal
 * tempo variance to be useful (classical, opera, world music, jazz-as-a-
 * whole) are deliberately left out rather than given a misleadingly precise
 * number. */

export type BpmEntry = { low: number; high: number; typical: number };

const BPM_TABLE: Record<string, BpmEntry> = {
  rnb: { low: 60, high: 90, typical: 72 },
  rhythmandblues: { low: 60, high: 90, typical: 72 },
  soul: { low: 60, high: 100, typical: 80 },
  neosoul: { low: 70, high: 100, typical: 85 },
  hiphop: { low: 85, high: 100, typical: 92 },
  rap: { low: 85, high: 105, typical: 95 },
  trap: { low: 130, high: 170, typical: 150 },
  drill: { low: 130, high: 145, typical: 140 },
  grime: { low: 130, high: 140, typical: 140 },
  funk: { low: 100, high: 120, typical: 110 },
  disco: { low: 110, high: 130, typical: 120 },
  pop: { low: 100, high: 130, typical: 120 },
  synthpop: { low: 100, high: 130, typical: 115 },
  rock: { low: 100, high: 140, typical: 120 },
  altrock: { low: 100, high: 140, typical: 120 },
  alternative: { low: 100, high: 140, typical: 120 },
  indie: { low: 100, high: 130, typical: 115 },
  indierock: { low: 100, high: 140, typical: 118 },
  indiepop: { low: 100, high: 130, typical: 115 },
  punk: { low: 150, high: 200, typical: 170 },
  postpunk: { low: 110, high: 150, typical: 130 },
  emo: { low: 120, high: 170, typical: 145 },
  grunge: { low: 100, high: 140, typical: 115 },
  metal: { low: 100, high: 160, typical: 130 },
  heavymetal: { low: 110, high: 160, typical: 130 },
  hardcore: { low: 150, high: 200, typical: 175 },
  electronic: { low: 100, high: 140, typical: 120 },
  edm: { low: 125, high: 135, typical: 128 },
  house: { low: 118, high: 128, typical: 124 },
  techno: { low: 120, high: 150, typical: 130 },
  trance: { low: 128, high: 140, typical: 138 },
  dubstep: { low: 135, high: 145, typical: 140 },
  dnb: { low: 160, high: 180, typical: 174 },
  drumandbass: { low: 160, high: 180, typical: 174 },
  ambient: { low: 60, high: 90, typical: 75 },
  lofi: { low: 60, high: 90, typical: 80 },
  folk: { low: 80, high: 120, typical: 95 },
  singersongwriter: { low: 70, high: 110, typical: 90 },
  acoustic: { low: 70, high: 110, typical: 90 },
  country: { low: 90, high: 130, typical: 110 },
  bluegrass: { low: 100, high: 140, typical: 120 },
  blues: { low: 60, high: 120, typical: 90 },
  reggae: { low: 60, high: 90, typical: 76 },
  ska: { low: 120, high: 160, typical: 140 },
  dancehall: { low: 90, high: 110, typical: 100 },
  afrobeat: { low: 95, high: 115, typical: 105 },
  latin: { low: 95, high: 140, typical: 115 },
  reggaeton: { low: 85, high: 100, typical: 92 },
  kpop: { low: 90, high: 130, typical: 115 },
  jpop: { low: 100, high: 130, typical: 115 },
  gospel: { low: 70, high: 140, typical: 100 }
};

export type BpmEstimate = {
  low: number;
  high: number;
  typical: number;
  /** "medium" when two or more of the track's genre tags independently
   * point to overlapping ranges — agreement between independent tags is a
   * real (if still soft) signal. "low" when it rests on a single tag. */
  confidence: "low" | "medium";
  basis: string[];
};

/** Estimates a tempo range from genre tags only — never mood tags, which
 * are too subjective to anchor a tempo prior on. Picks the tag with the
 * tightest (most specific) range as the anchor, then narrows to the
 * intersection with any other recognized genre tag whose range overlaps
 * it. Returns null if none of the given tags are in the table. */
export function estimateBpm(genreTags: string[]): BpmEstimate | null {
  const entries = genreTags
    .map((tag) => ({ tag, entry: BPM_TABLE[normalize(tag)] }))
    .filter((e): e is { tag: string; entry: BpmEntry } => Boolean(e.entry));

  if (!entries.length) return null;

  entries.sort((a, b) => a.entry.high - a.entry.low - (b.entry.high - b.entry.low));
  const anchor = entries[0];

  let low = anchor.entry.low;
  let high = anchor.entry.high;
  let narrowed = false;
  const basis = [anchor.tag];

  for (const e of entries.slice(1)) {
    const overlapLow = Math.max(low, e.entry.low);
    const overlapHigh = Math.min(high, e.entry.high);
    if (overlapLow < overlapHigh) {
      low = overlapLow;
      high = overlapHigh;
      narrowed = true;
      basis.push(e.tag);
    }
  }

  return {
    low,
    high,
    typical: Math.round((low + high) / 2),
    confidence: narrowed ? "medium" : "low",
    basis
  };
}

/** Range-overlap distance between two estimates, used as a tiebreaker — 0
 * when the ranges overlap (treated as "close enough"), otherwise the gap
 * between the nearest edges. Never compares two single-point numbers,
 * since neither estimate claims that kind of precision. */
export function bpmDistance(a: BpmEstimate | null, b: BpmEstimate | null): number | null {
  if (!a || !b) return null;
  if (a.low <= b.high && b.low <= a.high) return 0;
  return a.low > b.high ? a.low - b.high : b.low - a.high;
}
