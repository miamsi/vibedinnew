type TagPillProps = {
  label: string;
  color: string;
};

export function TagPill({ label, color }: TagPillProps) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.08em]"
      style={{
        borderColor: `${color}55`,
        backgroundColor: `${color}14`,
        color
      }}
    >
      {label}
    </span>
  );
}
