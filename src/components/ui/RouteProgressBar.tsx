"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function RouteProgressBar() {
  const pathname = usePathname();
  const barRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    // Start the animation
    bar.style.transition = "none";
    bar.style.width = "0%";
    bar.style.opacity = "1";

    const frame = requestAnimationFrame(() => {
      bar.style.transition = "width 400ms ease";
      bar.style.width = "75%";
    });

    timerRef.current = setTimeout(() => {
      bar.style.transition = "width 200ms ease, opacity 300ms ease 200ms";
      bar.style.width = "100%";
      setTimeout(() => {
        bar.style.opacity = "0";
      }, 200);
    }, 300);

    return () => {
      cancelAnimationFrame(frame);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pathname]);

  return (
    <div
      ref={barRef}
      className="fixed top-0 left-0 h-[2.5px] z-[999999] pointer-events-none"
      style={{
        background: "linear-gradient(90deg, #7C3AED, #6366F1, #8B5CF6)",
        boxShadow: "0 0 8px rgba(124, 58, 237, 0.6)",
        width: "0%",
        opacity: 0,
      }}
    />
  );
}
