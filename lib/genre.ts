/** Last.fm tags are a flat, user-submitted folksonomy — genre, mood, era,
 * and noise ("seen live", "favorites") all mixed in one list with no
 * structure. This file draws the genre/mood line ourselves so the rest of
 * the pipeline can treat genre as a near-hard constraint and mood as a
 * refinement within it, instead of treating every tag as equally soft. */

const GENRE_TAGS = new Set([
  "rnb",
  "rhythmandblues",
  "soul",
  "neosoul",
  "hiphop",
  "rap",
  "trap",
  "drill",
  "grime",
  "jazz",
  "funk",
  "disco",
  "pop",
  "synthpop",
  "rock",
  "altrock",
  "alternative",
  "indie",
  "indierock",
  "indiepop",
  "punk",
  "postpunk",
  "emo",
  "grunge",
  "metal",
  "heavymetal",
  "hardcore",
  "electronic",
  "edm",
  "house",
  "techno",
  "trance",
  "dubstep",
  "dnb",
  "drumandbass",
  "ambient",
  "lofi",
  "classical",
  "opera",
  "folk",
  "singersongwriter",
  "acoustic",
  "country",
  "bluegrass",
  "blues",
  "reggae",
  "ska",
  "dancehall",
  "afrobeat",
  "latin",
  "reggaeton",
  "kpop",
  "jpop",
  "gospel",
  "worldmusic"
]);

function normalize(tag: string): string {
  return tag.toLowerCase().replace(/[\s\-&]/g, "");
}

/** Splits a track's Last.fm tags into genre-ish and mood/descriptor-ish
 * buckets, preserving Last.fm's original relevance order within each. */
export function classifyTags(tags: string[]): { genres: string[]; moods: string[] } {
  const genres: string[] = [];
  const moods: string[] = [];
  for (const raw of tags) {
    const n = normalize(raw);
    if (GENRE_TAGS.has(n)) genres.push(raw);
    else moods.push(raw);
  }
  return { genres, moods };
}
