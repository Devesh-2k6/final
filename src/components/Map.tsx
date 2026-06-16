"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { MapProps } from "./MapComponent";

// Dynamically import the map component to avoid Next.js SSR window errors
const MapComponent = dynamic(() => import("./MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 text-gray-400">
      <Loader2 size={24} className="animate-spin" />
    </div>
  ),
});

export default function Map(props: MapProps) {
  return <MapComponent {...props} />;
}
