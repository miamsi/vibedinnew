export type TrackSeed = {
  artist: string;
  track: string;
};

export type TrackAssets = {
  art: string | null;
  preview: string | null;
};

export type TrackInfo = TrackSeed &
  TrackAssets & {
    tags: string[];
    listeners?: string;
  };

export type Recommendation = TrackSeed &
  TrackAssets & {
    match: number;
  };

export type VibeResult = {
  seed: TrackInfo;
  blurb: string | null;
  recommendations: Recommendation[];
};

export type SearchSuggestion = TrackSeed;
