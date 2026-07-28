export type TrackSeed = {
  artist: string;
  track: string;
};

export type TrackAssets = {
  art: string | null;
  preview: string | null;
};

export type BpmEstimate = {
  low: number;
  high: number;
  typical: number;
  confidence: "low" | "medium";
  basis: string[];
};

export type TagMatch = {
  tier: number;
  possible: number;
};

export type TrackInfo = TrackSeed &
  TrackAssets & {
    tags: string[];
    listeners?: string;
    bpm?: BpmEstimate | null;
  };

export type Recommendation = TrackSeed &
  TrackAssets & {
    match: number;
    why?: string;
    tagMatch?: TagMatch;
    bpm?: BpmEstimate | null;
  };

export type VibeResult = {
  seed: TrackInfo;
  blurb: string | null;
  recommendations: Recommendation[];
};

export type SearchSuggestion = TrackSeed;
