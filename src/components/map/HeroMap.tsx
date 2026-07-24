"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useAdvancedMarkerRef
} from "@vis.gl/react-google-maps";
import { listShops, type ShopWithDescription } from "@/services/shops";

const CHENNAI_CENTER = { lat: 13.0827, lng: 80.2707 };
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_PLATFORM_KEY || "";

// Custom Marker Component to handle InfoWindow
function ShopMarker({ shop }: { shop: ShopWithDescription }) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [infowindowOpen, setInfowindowOpen] = useState(false);

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        onClick={() => setInfowindowOpen(true)}
        position={{ lat: shop.latitude, lng: shop.longitude }}
        title={shop.name}
      >
        <motion.div
          initial={{ y: 0 }}
          animate={{ y: [-4, 4, -4] }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: Math.random() * 2 // Randomize offset for "Antigravity" feel
          }}
          className="relative flex items-center justify-center w-8 h-8 cursor-pointer"
        >
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40 animate-ping"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white shadow-xl shadow-emerald-500/40"></span>
        </motion.div>
      </AdvancedMarker>
      {infowindowOpen && (
        <InfoWindow
          anchor={marker}
          maxWidth={200}
          onCloseClick={() => setInfowindowOpen(false)}
        >
          <div className="p-1">
            <div className="text-emerald-600 text-[10px] font-black uppercase tracking-widest mb-1">
              {shop.deal_count} {shop.deal_count === 1 ? 'Deal' : 'Deals'}
            </div>
            <div className="text-sm font-bold text-gray-900">{shop.name}</div>
            <div className="text-[10px] text-gray-500 mt-1 line-clamp-2">{shop.address}</div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export default function HeroMap() {
  const [shops, setShops] = useState<ShopWithDescription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch live shops with active deals
    listShops().then(data => {
      setShops(data.filter(s => s.deal_count && s.deal_count > 0));
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-emerald-50/30 text-emerald-800 p-6 text-center">
        <p className="font-bold">Google Maps API Key Missing</p>
        <p className="text-xs mt-2 opacity-70 text-balance">Please check your .env file and ensure GOOGLE_MAPS_PLATFORM_KEY is set.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full rounded-3xl overflow-hidden shadow-2xl border border-emerald-100/50 relative z-10 group">
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <Map
          defaultCenter={CHENNAI_CENTER}
          defaultZoom={13}
          mapId="e528822502690d5c" // Example Map ID for styled maps
          disableDefaultUI={true}
          gestureHandling="greedy"
          className="w-full h-full"
        >
          {shops.map((shop) => (
            <ShopMarker key={shop.id} shop={shop} />
          ))}
        </Map>
      </APIProvider>

      {/* Floating UI Overlays */}
      <div className="absolute bottom-4 left-4 z-20 bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl border border-emerald-100 shadow-lg shadow-emerald-950/5 flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>
        <span className="text-xs font-bold text-slate-800 uppercase tracking-widest">Live Deals Map</span>
      </div>

      {loading && (
        <div className="absolute inset-0 bg-emerald-50/20 backdrop-blur-[2px] z-30 flex items-center justify-center">
          <div className="bg-white/80 px-4 py-2 rounded-full shadow-lg border border-emerald-100 flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-emerald-800">Updating live inventory...</span>
          </div>
        </div>
      )}
    </div>
  );
}
