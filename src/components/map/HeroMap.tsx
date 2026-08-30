"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";

const LeafletHeroMap = dynamic(() => import("./LeafletHeroMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-emerald-50/50 dark:bg-gray-900 text-emerald-700 dark:text-emerald-400">
      <div className="animate-pulse flex flex-col items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600">
          <MapPin size={22} className="animate-bounce" />
        </div>
        <p className="text-xs font-bold uppercase tracking-wider">Loading Live Deal Radar...</p>
      </div>
    </div>
  ),
});

export default function HeroMap() {
  return (
    <div className="w-full h-full rounded-3xl overflow-hidden shadow-2xl border border-emerald-100/60 dark:border-gray-800 relative z-10">
      <LeafletHeroMap />
    </div>
  );
}
