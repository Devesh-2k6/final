"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { 
  MapPin, Navigation, Sliders, Locate, Store, Info, CircleDot, Sparkles 
} from "lucide-react";
import type { ApiProduct as Product, ApiShopSummary as Shop } from "@/types/product";
import dynamic from "next/dynamic";

const LeafletMapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-80 rounded-2xl flex items-center justify-center bg-slate-100 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 animate-pulse">
      <div className="flex flex-col items-center">
        <MapPin size={32} className="text-emerald-500 mb-2 animate-bounce" />
        <p className="text-slate-500 dark:text-gray-400 font-bold text-xs">Loading Live High-Definition Deals Map...</p>
      </div>
    </div>
  ),
});

// Helper: Haversine distance formula
export function getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * 
      Math.cos((lat2 * Math.PI) / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

interface DealsMapProps {
  products: Product[];
  shops: Shop[];
  userLocation: { lat: number; lng: number } | null;
  setUserLocation: (loc: { lat: number; lng: number }) => void;
  maxDistance: number;
  setMaxDistance: (dist: number) => void;
  selectedShopId: string | null;
  onSelectShop: (shopId: string | null) => void;
  onReserveProduct: (product: Product) => void;
}

export default function DealsMap({
  products,
  shops,
  userLocation,
  setUserLocation,
  maxDistance,
  setMaxDistance,
  selectedShopId,
  onSelectShop,
  onReserveProduct,
}: DealsMapProps) {
  const [isLocating, setIsLocating] = useState(false);

  // Group products by shop
  const shopListingCounts = useMemo(() => {
    return products.reduce((acc, p) => {
      acc[p.shop_id] = (acc[p.shop_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [products]);

  // Filter shops with listings
  const activeShops = useMemo(() => {
    return shops.filter((shop) => (shopListingCounts[shop.id] || 0) > 0);
  }, [shops, shopListingCounts]);

  // Default coordinate (Chennai / India default)
  const defaultCenter = { lat: 13.0827, lng: 80.2707 };
  const currentCenter = userLocation || defaultCenter;

  // Request browser geolocation
  const handleLocateMe = () => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsLocating(false);
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          setIsLocating(false);
          console.warn("Geolocation access denied or failed:", error);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  // Filtered shops based on radius
  const visibleShops = useMemo(() => {
    return activeShops.filter((shop) => {
      if (maxDistance === 999 || !userLocation) return true;
      const dist = getDistanceInKm(
        userLocation.lat,
        userLocation.lng,
        shop.latitude || currentCenter.lat,
        shop.longitude || currentCenter.lng
      );
      return dist <= maxDistance;
    });
  }, [activeShops, maxDistance, userLocation, currentCenter]);

  // Format markers for Leaflet Map
  const markers = useMemo(() => {
    return visibleShops.map((shop) => ({
      id: shop.id,
      lat: shop.latitude || currentCenter.lat,
      lng: shop.longitude || currentCenter.lng,
      label: shop.name,
      dealCount: shopListingCounts[shop.id] || 0,
    }));
  }, [visibleShops, currentCenter, shopListingCounts]);

  const selectedShopObj = useMemo(() => {
    return visibleShops.find((s) => s.id === selectedShopId) || null;
  }, [visibleShops, selectedShopId]);

  const selectedShopDeals = useMemo(() => {
    if (!selectedShopId) return [];
    return products.filter((p) => p.shop_id === selectedShopId && p.quantity > 0);
  }, [products, selectedShopId]);

  return (
    <div id="live-hd-deals-map-dashboard" className="space-y-4">
      {/* Controls Panel */}
      <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-3xl p-5 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Proximity Filter Slider */}
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-2xl shadow-xs">
            <Sliders size={18} />
          </div>
          <div className="space-y-1 flex-1 md:flex-none md:w-64">
            <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-gray-400">
              <span>Rescue Radius</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                {maxDistance === 999 ? "All Available Deals" : `${maxDistance} km Radius`}
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="10"
              step="0.5"
              value={maxDistance === 999 ? 10 : maxDistance}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setMaxDistance(val === 10 ? 999 : val);
              }}
              className="w-full accent-emerald-500 bg-slate-200 dark:bg-gray-700 rounded-lg appearance-none h-1.5 cursor-pointer"
            />
          </div>
        </div>

        {/* Action Controls & Store Count */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={isLocating}
            className="flex-1 md:flex-none bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Locate size={14} className={isLocating ? "animate-spin" : "text-emerald-600"} />
            {isLocating ? "Locating..." : "📍 Locate Me (GPS)"}
          </button>
          <div className="text-xs text-slate-600 dark:text-gray-300 font-bold px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-gray-800/80 border border-slate-200 dark:border-gray-700">
            <span>🏪 {visibleShops.length} Stores nearby</span>
          </div>
        </div>
      </div>

      {/* High-Definition 100% Free Leaflet / OpenStreetMap Container */}
      <div className="w-full h-96 sm:h-[440px] rounded-3xl overflow-hidden border-2 border-emerald-100 dark:border-gray-800 shadow-xl relative">
        <LeafletMapComponent
          lat={currentCenter.lat}
          lng={currentCenter.lng}
          zoom={13}
          originLocation={userLocation}
          markers={markers}
          selectedMarker={markers.find((m) => m.id === selectedShopId) || null}
          onMarkerClick={(marker) => onSelectShop(marker.id)}
          className="w-full h-full"
        />

        {/* Live HD Real Map Badge Overlay */}
        <div className="absolute top-3 left-3 z-[1000] bg-white/95 dark:bg-gray-900/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 shadow-md flex items-center gap-2 pointer-events-none">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-bold text-slate-800 dark:text-white">
            Live High-Definition Real Map (0 API Key Required)
          </span>
        </div>
      </div>

      {/* Selected Shop Deals Drawer / Popup */}
      {selectedShopObj && (
        <div className="bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800/60 rounded-3xl p-5 shadow-xl space-y-3 animate-in fade-in-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/50 text-orange-600 flex items-center justify-center">
                <Store size={18} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  {selectedShopObj.name}
                </h4>
                <p className="text-xs text-slate-500 line-clamp-1">{selectedShopObj.address}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelectShop(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-800 transition cursor-pointer text-xs font-bold"
            >
              ✕ Close
            </button>
          </div>

          {/* Active Deals at this shop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
            {selectedShopDeals.map((deal) => (
              <div
                key={deal.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-gray-800 border border-slate-200/80 dark:border-gray-700"
              >
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">{deal.name}</p>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-black text-emerald-600 dark:text-emerald-400">₹{deal.discount_price.toFixed(0)}</span>
                    <span className="text-[10px] text-slate-400 line-through">₹{deal.original_price.toFixed(0)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onReserveProduct(deal)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-xs transition active:scale-95 cursor-pointer"
                >
                  Reserve
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
