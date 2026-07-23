"use client";

import { motion } from "framer-motion";
import { Play, Pause, Music2 } from "lucide-react";
import { Recommendation } from "@/lib/types";
import { Vibe } from "@/lib/vibes";
import { VibeRing } from "./VibeRing";
import { usePreviewPlayer } from "./AudioProvider";

export function RecommendationCard({ rec, vibe, index }: { rec: Recommendation; vibe: Vibe; index: number }) {
  const { activeSrc, toggle } = usePreviewPlayer();
  const isPlaying = rec.preview !== null && activeSrc === rec.preview;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.04, 0.4), ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3 }}
      className="group relative flex flex-col items-center rounded-2xl border border-line bg-glass p-4 text-center backdrop-blur-xl transition-colors hover:border-ink-muted/60"
    >
      <button
        onClick={() => rec.preview && toggle(rec.preview)}
        disabled={!rec.preview}
        className="relative disabled:cursor-default"
        aria-label={rec.preview ? `Play preview of ${rec.track}` : "No preview available"}
      >
        <VibeRing size={92} color={vibe.accent} pct={rec.match} spinning={isPlaying}>
          {rec.art ? (
            <img src={rec.art} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-white/5">
              <Music2 className="text-ink-muted" size={20} />
            </div>
          )}
        </VibeRing>
        {rec.preview && (
          <span
            className="absolute inset-0 flex items-center justify-center rounded-full bg-canvas/0 text-ink opacity-0 transition-all duration-200 group-hover:bg-canvas/40 group-hover:opacity-100"
            style={{ margin: 10 }}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </span>
        )}
      </button>

      <p className="mt-3 line-clamp-1 w-full font-display text-sm font-medium text-ink">{rec.track}</p>
      <p className="line-clamp-1 w-full text-xs text-ink-muted">{rec.artist}</p>
      <p className="mt-1.5 font-mono text-[11px] tracking-[0.05em]" style={{ color: vibe.accent }}>
        {Math.round(rec.match * 100)}% match
      </p>
      {rec.why && <p className="mt-1.5 line-clamp-2 w-full text-[11px] leading-snug text-ink-muted/80">{rec.why}</p>}
    </motion.div>
  );
}
