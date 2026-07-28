"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles, Loader2 } from "lucide-react";
import clsx from "clsx";
import { SearchSuggestion } from "@/lib/types";

type Mode = "song" | "mood";

type SearchPanelProps = {
  onSelectSong: (seed: SearchSuggestion) => void;
  onSubmitMood: (description: string) => void;
  busy: boolean;
  accent: string;
};

const MOOD_EXAMPLES = [
  "rainy sunday, slow and acoustic",
  "3am drive, synth-heavy and moody",
  "sunlit kitchen, coffee and funk",
  "heartbreak but making it glamorous"
];

export function SearchPanel({ onSelectSong, onSubmitMood, busy, accent }: SearchPanelProps) {
  const [mode, setMode] = useState<Mode>("song");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode !== "song" || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setSuggestions(data.results ?? []);
        setOpen(true);
        setActiveIndex(-1);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, mode]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function pick(s: SearchSuggestion) {
    setQuery(`${s.artist} – ${s.track}`);
    setOpen(false);
    setSuggestions([]);
    onSelectSong(s);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (mode !== "song" || !open || !suggestions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      pick(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function handleMoodSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || busy) return;
    onSubmitMood(query.trim());
  }

  return (
    <div className="w-full max-w-xl">
      <div className="mb-4 inline-flex rounded-full border border-line bg-glass p-1 font-mono text-xs uppercase tracking-[0.08em]">
        {(["song", "mood"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setQuery("");
              setSuggestions([]);
              setOpen(false);
            }}
            className={clsx(
              "rounded-full px-4 py-1.5 transition-colors duration-300",
              mode === m ? "text-canvas" : "text-ink-muted hover:text-ink"
            )}
            style={mode === m ? { backgroundColor: accent } : undefined}
          >
            {m === "song" ? "By song" : "By mood"}
          </button>
        ))}
      </div>

      {mode === "song" ? (
        <div ref={boxRef} className="relative">
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-glass px-4 py-3.5 backdrop-blur-xl transition-colors focus-within:border-ink-muted">
            <Search size={18} className="text-ink-muted shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => suggestions.length > 0 && setOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder="Type a song you're obsessed with…"
              className="w-full bg-transparent font-body text-[15px] text-ink placeholder:text-ink-muted focus:outline-none"
              aria-label="Search for a song"
              autoComplete="off"
            />
            {searching && <Loader2 size={16} className="animate-spin text-ink-muted shrink-0" />}
          </div>

          <AnimatePresence>
            {open && suggestions.length > 0 && (
              <motion.ul
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-line bg-[#15111c]/95 backdrop-blur-xl shadow-2xl shadow-black/40"
              >
                {suggestions.map((s, i) => (
                  <li key={`${s.artist}-${s.track}-${i}`}>
                    <button
                      type="button"
                      onClick={() => pick(s)}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={clsx(
                        "flex w-full flex-col items-start px-4 py-2.5 text-left transition-colors",
                        activeIndex === i ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"
                      )}
                    >
                      <span className="text-sm text-ink">{s.track}</span>
                      <span className="text-xs text-ink-muted">{s.artist}</span>
                    </button>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div>
          <form
            onSubmit={handleMoodSubmit}
            className="flex items-center gap-3 rounded-2xl border border-line bg-glass px-4 py-3.5 backdrop-blur-xl transition-colors focus-within:border-ink-muted"
          >
            <Sparkles size={18} className="text-ink-muted shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Describe the mood you're chasing…"
              className="w-full bg-transparent font-body text-[15px] text-ink placeholder:text-ink-muted focus:outline-none"
              aria-label="Describe a mood"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={busy || !query.trim()}
              className="shrink-0 rounded-full px-4 py-1.5 font-mono text-xs uppercase tracking-[0.08em] text-canvas transition-opacity disabled:opacity-40"
              style={{ backgroundColor: accent }}
            >
              {busy ? "Finding…" : "Find it"}
            </button>
          </form>

          <div className="mt-3 flex flex-wrap gap-2">
            {MOOD_EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => {
                  setQuery(ex);
                  onSubmitMood(ex);
                }}
                disabled={busy}
                className="rounded-full border border-line px-3 py-1 font-mono text-[11px] text-ink-muted transition-colors hover:border-ink-muted hover:text-ink disabled:opacity-40"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
