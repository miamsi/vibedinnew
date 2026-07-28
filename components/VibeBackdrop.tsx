"use client";

import { motion } from "framer-motion";
import { Vibe } from "@/lib/vibes";

export function VibeBackdrop({ vibe }: { vibe: Vibe }) {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-canvas">
      <motion.div
        className="absolute h-[60vmax] w-[60vmax] rounded-full animate-blob-drift"
        style={{ top: "-15%", left: "-10%", filter: "blur(120px)" }}
        animate={{ backgroundColor: vibe.accent, opacity: 0.32 }}
        transition={{ duration: 1.4, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute h-[50vmax] w-[50vmax] rounded-full animate-blob-drift-slow"
        style={{ bottom: "-20%", right: "-10%", filter: "blur(110px)" }}
        animate={{ backgroundColor: vibe.glow, opacity: 0.5 }}
        transition={{ duration: 1.4, ease: "easeInOut" }}
      />
      <div className="grain-overlay absolute inset-0 mix-blend-overlay opacity-70" />
      <div className="absolute inset-0 bg-gradient-to-b from-canvas/10 via-transparent to-canvas" />
    </div>
  );
}
