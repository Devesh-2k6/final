"use client";

import confetti from "canvas-confetti";
import { useCallback } from "react";

export function useConfetti() {
  const triggerConfetti = useCallback((event?: React.MouseEvent) => {
    // Determine position from click event or default to center
    const x = event ? event.clientX / window.innerWidth : 0.5;
    const y = event ? event.clientY / window.innerHeight : 0.5;

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { x, y },
      colors: ["#10B981", "#F59E0B", "#FFFFFF"], // Emerald, Amber, White
      disableForReducedMotion: true,
      zIndex: 1000
    });
  }, []);

  return { triggerConfetti };
}
