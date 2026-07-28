"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

type AudioContextValue = {
  activeSrc: string | null;
  toggle: (src: string) => void;
};

const Ctx = createContext<AudioContextValue | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeSrc, setActiveSrc] = useState<string | null>(null);

  useEffect(() => {
    const el = new Audio();
    el.preload = "none";
    const onEnded = () => setActiveSrc(null);
    el.addEventListener("ended", onEnded);
    audioRef.current = el;
    return () => {
      el.removeEventListener("ended", onEnded);
      el.pause();
    };
  }, []);

  function toggle(src: string) {
    const el = audioRef.current;
    if (!el) return;

    if (activeSrc === src) {
      el.pause();
      setActiveSrc(null);
      return;
    }

    el.src = src;
    el.currentTime = 0;
    el.play().catch(() => {
      // Autoplay can be blocked before any user gesture reaches the
      // element; the click that triggered this already counts as one,
      // so failures here are rare and safely ignorable.
    });
    setActiveSrc(src);
  }

  return <Ctx.Provider value={{ activeSrc, toggle }}>{children}</Ctx.Provider>;
}

export function usePreviewPlayer() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePreviewPlayer must be used within AudioProvider");
  return ctx;
}
