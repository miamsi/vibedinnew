export type Vibe = {
  key: string;
  label: string;
  accent: string;
  glow: string;
};

// Duotone (accent + glow) per mood/genre tag. Rendered as a blurred ambient
// backdrop over the dark canvas, and reused for rings, pills, and focus
// states, so the whole UI breathes the same atmosphere as the matched track.
export const VIBE_MAP: Record<string, Vibe> = {
  dark: { key: "dark", label: "dark", accent: "#B98CFF", glow: "#3C2566" },
  chill: { key: "chill", label: "chill", accent: "#7FD8D8", glow: "#1F4A4D" },
  summer: { key: "summer", label: "summer", accent: "#FFB703", glow: "#6B4A08" },
  sad: { key: "sad", label: "sad", accent: "#6FA3D8", glow: "#20395C" },
  energetic: { key: "energetic", label: "energetic", accent: "#FF5D5D", glow: "#6E1F1F" },
  dreamy: { key: "dreamy", label: "dreamy", accent: "#E3A9C5", glow: "#552E48" },
  electronic: { key: "electronic", label: "electronic", accent: "#B14BFF", glow: "#3D1266" },
  jazz: { key: "jazz", label: "jazz", accent: "#4FC4B8", glow: "#0F3D3A" },
  rock: { key: "rock", label: "rock", accent: "#FF6A5D", glow: "#661E17" },
  soul: { key: "soul", label: "soul", accent: "#C98BDB", glow: "#432255" },
  pop: { key: "pop", label: "pop", accent: "#FF8FC7", glow: "#63274A" },
  blues: { key: "blues", label: "blues", accent: "#4D8FD9", glow: "#163459" },
  acoustic: { key: "acoustic", label: "acoustic", accent: "#D8B27C", glow: "#4A3A1F" },
  folk: { key: "folk", label: "folk", accent: "#B08968", glow: "#3F3020" },
  ambient: { key: "ambient", label: "ambient", accent: "#8FBFD9", glow: "#25455A" },
  hiphop: { key: "hiphop", label: "hip-hop", accent: "#FFC24B", glow: "#5A3C08" },
  rap: { key: "rap", label: "rap", accent: "#FFC24B", glow: "#5A3C08" },
  metal: { key: "metal", label: "metal", accent: "#C4C9D4", glow: "#2A2E38" },
  classical: { key: "classical", label: "classical", accent: "#E8D9B0", glow: "#4A4128" },
  indie: { key: "indie", label: "indie", accent: "#9FD88F", glow: "#2C4A22" },
  punk: { key: "punk", label: "punk", accent: "#FF4D8D", glow: "#661433" },
  funk: { key: "funk", label: "funk", accent: "#FFA13D", glow: "#5C3A0C" },
  reggae: { key: "reggae", label: "reggae", accent: "#6FD87E", glow: "#1F4A2A" },
  country: { key: "country", label: "country", accent: "#E0A45C", glow: "#4A2F10" },
  romantic: { key: "romantic", label: "romantic", accent: "#FF8FA3", glow: "#5C2233" },
  happy: { key: "happy", label: "happy", accent: "#FFD166", glow: "#5C4110" },
  mellow: { key: "mellow", label: "mellow", accent: "#9AD1C7", glow: "#25453F" },
  party: { key: "party", label: "party", accent: "#FF4FD8", glow: "#5C1552" },
  instrumental: { key: "instrumental", label: "instrumental", accent: "#B7C4E0", glow: "#2E3A5C" }
};

export const DEFAULT_VIBE: Vibe = {
  key: "default",
  label: "undiscovered",
  accent: "#8B7FD1",
  glow: "#241C3D"
};

/** Picks the first tag (Last.fm returns them ranked by relevance) that
 * matches a known vibe. Falls back to the idle signal color. */
export function pickVibe(tags: string[]): Vibe {
  for (const raw of tags) {
    const t = raw.toLowerCase().replace(/[\s-]/g, "");
    if (VIBE_MAP[t]) return VIBE_MAP[t];
  }
  return DEFAULT_VIBE;
}
