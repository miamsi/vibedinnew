function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={`animate-shimmer rounded-xl bg-[length:200%_100%] bg-gradient-to-r from-white/[0.04] via-white/[0.09] to-white/[0.04] ${className ?? ""}`}
    />
  );
}

export function LoadingState() {
  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-8">
      <div className="flex w-full items-center gap-6 rounded-3xl border border-line bg-glass p-6 backdrop-blur-xl sm:p-8">
        <Shimmer className="h-28 w-28 shrink-0 rounded-full" />
        <div className="flex-1 space-y-3">
          <Shimmer className="h-3 w-24" />
          <Shimmer className="h-7 w-3/5" />
          <Shimmer className="h-4 w-2/5" />
          <div className="flex gap-2 pt-1">
            <Shimmer className="h-6 w-16 rounded-full" />
            <Shimmer className="h-6 w-16 rounded-full" />
            <Shimmer className="h-6 w-16 rounded-full" />
          </div>
        </div>
      </div>

      <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-glass p-4"
          >
            <Shimmer className="h-[92px] w-[92px] rounded-full" />
            <Shimmer className="h-3 w-20" />
            <Shimmer className="h-2.5 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}
