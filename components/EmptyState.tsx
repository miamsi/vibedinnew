import { Waves } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex max-w-md flex-col items-center gap-3 py-10 text-center">
      <Waves size={22} className="text-ink-muted" />
      <p className="text-ink-muted">
        Drop in a song you can't stop playing, or describe the mood you're chasing — Vibedin reads its sonic
        DNA and keeps the wave going.
      </p>
    </div>
  );
}
