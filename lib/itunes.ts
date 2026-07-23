import { TrackAssets } from "./types";

const ITUNES_URL = "https://itunes.apple.com/search";

export async function getTrackAssets(artist: string, track: string): Promise<TrackAssets> {
  try {
    const url = new URL(ITUNES_URL);
    url.searchParams.set("term", `${artist} ${track}`);
    url.searchParams.set("media", "music");
    url.searchParams.set("entity", "song");
    url.searchParams.set("limit", "1");

    const res = await fetch(url.toString(), { next: { revalidate: 0 } });
    if (!res.ok) return { art: null, preview: null };
    const data = await res.json();
    const item = data?.results?.[0];
    if (!item) return { art: null, preview: null };

    return {
      art: item.artworkUrl100 ? item.artworkUrl100.replace("100x100", "600x600") : null,
      preview: item.previewUrl ?? null
    };
  } catch {
    return { art: null, preview: null };
  }
}

/** Fetches iTunes assets for many tracks in parallel, capped so we don't
 * hammer the (unauthenticated, rate-sensitive) iTunes search endpoint. */
export async function getManyTrackAssets<T extends { artist: string; track: string }>(
  tracks: T[],
  concurrency = 6
): Promise<(T & TrackAssets)[]> {
  const results: (T & TrackAssets)[] = new Array(tracks.length) as any;
  let cursor = 0;

  async function worker() {
    while (cursor < tracks.length) {
      const i = cursor++;
      const t = tracks[i];
      const assets = await getTrackAssets(t.artist, t.track);
      results[i] = { ...t, ...assets };
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, tracks.length) }, worker));
  return results;
}
