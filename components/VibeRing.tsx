"use client";

import { motion } from "framer-motion";

type VibeRingProps = {
  size: number;
  color: string;
  pct?: number; // 0..1, omit for the origin/seed track
  spinning?: boolean;
  children: React.ReactNode;
};

/**
 * Wraps artwork in a thin progress ring — a dial reading the strength of
 * the sonic match, styled after a vinyl groove. When a preview is playing,
 * the whole disc turns slowly, like a record on a platter.
 */
export function VibeRing({ size, color, pct, spinning, children }: VibeRingProps) {
  const stroke = 3;
  const radius = size / 2 - stroke;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = pct !== undefined ? circumference * (1 - Math.max(0, Math.min(1, pct))) : 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <motion.div
        className="absolute inset-0 rounded-full overflow-hidden"
        animate={spinning ? { rotate: 360 } : { rotate: 0 }}
        transition={spinning ? { duration: 5, repeat: Infinity, ease: "linear" } : { duration: 0.4 }}
      >
        {children}
      </motion.div>

      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 -rotate-90 pointer-events-none"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeOpacity={pct !== undefined ? 0.18 : 0.35}
          strokeWidth={stroke}
        />
        {pct !== undefined && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashoffset}
            style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)" }}
          />
        )}
      </svg>
    </div>
  );
}
