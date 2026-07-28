"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { VibeResult, SearchSuggestion } from "@/lib/types";
import { pickVibe, DEFAULT_VIBE } from "@/lib/vibes";
import { AudioProvider } from "./AudioProvider";
import { VibeBackdrop } from "./VibeBackdrop";
import { SearchPanel } from "./SearchPanel";
import { TrackHero } from "./TrackHero";
import { RecommendationGrid } from "./RecommendationGrid";
import { EmptyState } from "./EmptyState";
import { LoadingState } from "./LoadingState";

export function VibedinApp() {
  const [result, setResult] = useState<(VibeResult & { moodQuery?: string }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vibe = useMemo(() => (result ? pickVibe(result.seed.tags) : DEFAULT_VIBE), [result]);

  async function runSongSearch(seed: SearchSuggestion) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vibe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(seed)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't find that track.");
      setResult(data);
    } catch (e: any) {
      setError(e.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  async function runMoodSearch(description: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vibe-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't translate that mood.");
      setResult(data);
    } catch (e: any) {
      setError(e.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AudioProvider>
      <VibeBackdrop vibe={vibe} />

      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center px-5 pb-16 pt-10 sm:pt-14">
        <header className="mb-10 flex w-full items-center justify-between">
          <span className="font-display text-lg font-semibold tracking-tight text-ink">
            vibed<span style={{ color: vibe.accent }}>in</span>
          </span>
          <span className="hidden font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted sm:block">
            sonic dna matcher
          </span>
        </header>

        <SearchPanel onSelectSong={runSongSearch} onSubmitMood={runMoodSearch} busy={loading} accent={vibe.accent} />

        <div className="mt-10 flex w-full flex-1 flex-col items-center gap-8">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-200"
              >
                <AlertCircle size={16} className="shrink-0" />
                {error}
              </motion.div>
            )}

            {loading && (
              <motion.div key="loading" exit={{ opacity: 0 }} className="w-full flex justify-center">
                <LoadingState />
              </motion.div>
            )}

            {!loading && !error && !result && (
              <motion.div key="empty" exit={{ opacity: 0 }}>
                <EmptyState />
              </motion.div>
            )}

            {!loading && result && (
              <motion.div key="result" className="flex w-full flex-col items-center gap-8">
                <TrackHero seed={result.seed} blurb={result.blurb} vibe={vibe} moodQuery={result.moodQuery} />
                <RecommendationGrid recs={result.recommendations} vibe={vibe} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <footer className="mt-16 font-mono text-[11px] text-ink-muted/70">
          data from Last.fm &amp; iTunes{result?.blurb ? " · notes by Groq" : ""}
        </footer>
      </div>
    </AudioProvider>
  );
}
