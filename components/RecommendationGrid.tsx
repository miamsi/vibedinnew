import { Recommendation } from "@/lib/types";
import { Vibe } from "@/lib/vibes";
import { RecommendationCard } from "./RecommendationCard";

export function RecommendationGrid({ recs, vibe }: { recs: Recommendation[]; vibe: Vibe }) {
  if (!recs.length) {
    return (
      <div className="w-full max-w-3xl rounded-2xl border border-line bg-glass p-8 text-center backdrop-blur-xl">
        <p className="text-ink-muted">
          No strong matches this time — Last.fm's similarity data thins out for niche tracks. Try a more
          well-known song.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">
          {recs.length} track{recs.length === 1 ? "" : "s"} in the same {vibe.label} orbit
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {recs.map((r, i) => (
          <RecommendationCard key={`${r.artist}-${r.track}-${i}`} rec={r} vibe={vibe} index={i} />
        ))}
      </div>
    </div>
  );
}
