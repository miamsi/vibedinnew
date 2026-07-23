import { getSimilarTracks, getTrackTags } from "./lastfm";
import { getManyTrackAssets, getTrackAssets } from "./itunes";
import { generateVibeBlurb } from "./groq";
import { VibeResult } from "./types";

/** The full pipeline for one seed track: tags + assets + similar tracks
 * (each enriched with iTunes art/preview) + an optional Groq vibe blurb.
 * Shared by the direct song-search flow and the mood-search flow so both
 * end up with an identical, fully-hydrated payload. */
export async function buildVibeResult(artist: string, track: string): Promise<VibeResult> {
  const [tags, seedAssets, rawRecs] = await Promise.all([
    getTrackTags(artist, track),
    getTrackAssets(artist, track),
    getSimilarTracks(artist, track)
  ]);

  const [recommendations, blurb] = await Promise.all([
    getManyTrackAssets(rawRecs),
    generateVibeBlurb(artist, track, tags)
  ]);

  return {
    seed: { artist, track, tags, ...seedAssets },
    blurb,
    recommendations
  };
}
