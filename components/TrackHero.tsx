"use client";

import { motion } from "framer-motion";
import { Play, Pause, Music2 } from "lucide-react";
import { TrackInfo } from "@/lib/types";
import { Vibe } from "@/lib/vibes";
import { VibeRing } from "./VibeRing";
import { TagPill } from "./TagPill";
import { usePreviewPlayer } from "./AudioProvider";

export function TrackHero({
  seed,
  blurb,
  vibe,
  moodQuery
}: {
  seed: TrackInfo;
  blurb: string | null;
  vibe: Vibe;
  moodQuery?: string;
}) {
  const { activeSrc, toggle } = usePreviewPlayer();
  const isPlaying = seed.preview !== null && activeSrc === seed.preview;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-3xl rounded-3xl border border-line bg-glass p-6 backdrop-blur-xl sm:p-8"
    >
      {moodQuery && (
        <p className="mb-5 font-mono text-xs uppercase tracking-[0.1em] text-ink-muted">
          Matched from “{moodQuery}”
        </p>
      )}
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <VibeRing size={112} color={vibe.accent} spinning={isPlaying}>
          {seed.art ? (
            <img src={seed.art} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-white/5">
              <Music2 className="text-ink-muted" size={28} />
            </div>
          )}
        </VibeRing>

        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-muted">
            Now vibing with
          </p>
          <h1 className="mt-1 text-balance font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
            {seed.track}
          </h1>
          <p className="mt-1 text-lg text-ink-muted">{seed.artist}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {seed.tags.map((t) => (
              <TagPill key={t} label={t} color={vibe.accent} />
            ))}
          </div>

          {blurb && <p className="mt-4 max-w-lg text-[15px] italic leading-relaxed text-ink-muted">“{blurb}”</p>}

          {seed.preview && (
            <button
              onClick={() => toggle(seed.preview!)}
              className="mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 font-mono text-xs uppercase tracking-[0.08em] text-canvas transition-transform active:scale-95"
              style={{ backgroundColor: vibe.accent }}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              {isPlaying ? "Playing preview" : "Play preview"}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
