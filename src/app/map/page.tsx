"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { 
  ArrowLeft, Search, Filter, MapPin, Loader2, Navigation, Locate, 
  Store, Compass, Eye, Sparkles, SlidersHorizontal 
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

import { getErrorMessage } from "@/api/errors";
import type { MapMarker } from "@/components/MapComponent";
import { listShops, type ShopWithDescription } from "@/services/shops";
import { getProducts } from "@/services/products";
import type { ApiProduct } from "@/types/product";
import { getSafeImageUrl } from "@/lib/images";
import { fetchIpGeolocation } from "@/lib/geolocation";
import { ShopperLayout } from "@/components/layout/ShopperLayout";

const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-emerald-50 dark:bg-gray-900">
      <div className="animate-pulse flex flex-col items-center">
        <MapPin size={36} className="text-emerald-500 mb-2 animate-bounce" />
        <p className="text-gray-500 dark:text-gray-400 font-bold text-sm">Loading Live Store Map...</p>
      </div>
    </div>
  ),
});

const QUICK_CITIES = [
  { name: "Delhi NCR", lat: 28.6139, lng: 77.2090 },
  { name: "Mumbai", lat: 19.0760, lng: 72.8777 },
  { name: "Bengaluru", lat: 12.9716, lng: 77.5946 },
  { name: "Chennai", lat: 13.0827, lng: 80.2707 },
  { name: "Hyderabad", lat: 17.3850, lng: 78.4867 },
  { name: "Kolkata", lat: 22.5726, lng: 88.3639 },
  { name: "Pune", lat: 18.5204, lng: 73.8567 },
  { name: "Ahmedabad", lat: 23.0225, lng: 72.5714 },
  { name: "Jaipur", lat: 26.9124, lng: 75.7873 },
  { name: "Chandigarh", lat: 30.7333, lng: 76.7794 },
  { name: "Dehradun", lat: 30.3165, lng: 78.0322 },
  { name: "Kochi", lat: 9.9312, lng: 76.2673 },
];

type SelectedShop = ShopWithDescription & { deals: ApiProduct[] };

export default function MapDiscovery() {
  const [shops, setShops] = useState<ShopWithDescription[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("ready");
  const [selectedShop, setSelectedShop] = useState<SelectedShop | null>(null);
  const [search, setSearch] = useState("");
  const [isSearchingGeocode, setIsSearchingGeocode] = useState(false);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [customCenter, setCustomCenter] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [mapLayerType, setMapLayerType] = useState<"streets" | "satellite">("streets");
  const [statusToast, setStatusToast] = useState<{ text: string; type: "info" | "success" | "error" } | null>(null);

  // Auto-locate user on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
        },
        (err) => {
          console.warn("Auto GPS lookup notice:", err);
          fetchIpGeolocation()
            .then((data) => {
              setUserLat(data.latitude);
              setUserLng(data.longitude);
            })
            .catch(() => {});
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }
  }, []);

  // Request High-Precision Live Location on Demand
  const handleLocateMe = () => {
    setIsLocating(true);
    setStatusToast({ text: "📡 Acquiring live GPS position...", type: "info" });

    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          setUserLat(latitude);
          setUserLng(longitude);
          setCustomCenter([latitude, longitude]);
          setIsLocating(false);
          setStatusToast({
            text: `✓ Live GPS centered (Accuracy: ±${Math.round(accuracy)}m)`,
            type: "success",
          });
          setTimeout(() => setStatusToast(null), 5000);
        },
        (err) => {
          console.warn("GPS failed, trying IP fallback:", err);
          fetchIpGeolocation()
            .then((data) => {
              setUserLat(data.latitude);
              setUserLng(data.longitude);
              setCustomCenter([data.latitude, data.longitude]);
              setStatusToast({ text: "✓ Centered via network location", type: "success" });
            })
            .catch(() => {
              setStatusToast({ text: "⚠️ Location permission denied in browser.", type: "error" });
            })
            .finally(() => {
              setIsLocating(false);
              setTimeout(() => setStatusToast(null), 5000);
            });
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      setIsLocating(false);
    }
  };

  // Load real registered shops from backend
  const load = useCallback(async () => {
    try {
      const [shopList, productList] = await Promise.all([
        listShops(),
        getProducts({ hideExpired: true }),
      ]);
      if (shopList && shopList.length > 0) {
        setShops(shopList);
      }
      setProducts(productList || []);
      setStatus("ready");
    } catch (e) {
      console.warn("Load shops notice:", e);
      setStatus("ready");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Handle direct address / area / pincode geocoding in floating search bar
  const handleSearchGeocode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = search.trim();
    if (!query) return;

    setIsSearchingGeocode(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        {
          headers: { "Accept-Language": "en" },
        }
      );
      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const targetLat = parseFloat(results[0].lat);
          const targetLng = parseFloat(results[0].lon);
          setCustomCenter([targetLat, targetLng]);
          setStatusToast({ text: `✓ Centered on: ${results[0].display_name.split(",")[0]}`, type: "success" });
          setTimeout(() => setStatusToast(null), 4000);
        }
      }
    } catch (err) {
      console.warn("Geocode error:", err);
    } finally {
      setIsSearchingGeocode(false);
    }
  };

  // Filtered shops based on text search
  const filteredShops = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return shops;
    return shops.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.address && s.address.toLowerCase().includes(q))
    );
  }, [shops, search]);

  // Center calculation prioritizes: Custom Center (Search/City) -> Selected Shop -> User GPS -> First Shop -> Default
  const mapCenter = useMemo((): [number, number] => {
    if (selectedShop) {
      return [selectedShop.latitude, selectedShop.longitude];
    }
    if (customCenter) {
      return customCenter;
    }
    if (userLat !== null && userLng !== null) {
      return [userLat, userLng];
    }
    if (filteredShops.length > 0) {
      return [filteredShops[0].latitude, filteredShops[0].longitude];
    }
    return [13.0827, 80.2707];
  }, [customCenter, selectedShop, userLat, userLng, filteredShops]);

  // Markers
  const mapMarkers: MapMarker[] = useMemo(
    () =>
      filteredShops.map((s) => ({
        id: s.id,
        lat: s.latitude,
        lng: s.longitude,
        label: s.name,
        dealCount: s.deal_count,
      })),
    [filteredShops]
  );

  const handleMarkerClick = (marker: MapMarker) => {
    const shop = shops.find((s) => s.id === marker.id);
    if (!shop) return;
    const deals = products.filter((p) => p.shop_id === shop.id);
    setSelectedShop({ ...shop, deals });
  };

  return (
    <ShopperLayout>
      <div className="h-screen w-full relative overflow-hidden bg-[#F4FBF7] text-slate-800">
      {/* Top Header Floating Search Bar & Controls */}
      <div className="absolute top-0 inset-x-0 z-[400] p-3 sm:p-4 pt-safe flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center gap-2">
          <Link
            href="/deals"
            className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl shadow-xl border border-orange-100/80 dark:border-gray-800 transition hover:scale-105 pointer-events-auto text-slate-700 dark:text-gray-200 hover:text-[#FF5B26] shrink-0"
            aria-label="Back to deals"
          >
            <ArrowLeft size={18} />
          </Link>

          {/* Search Form */}
          <form
            onSubmit={handleSearchGeocode}
            className="flex-1 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-2xl shadow-xl border border-orange-100/80 dark:border-gray-800 flex items-center px-3.5 py-2 pointer-events-auto focus-within:border-[#FF5B26] focus-within:ring-2 focus-within:ring-orange-500/20 transition-all"
          >
            <Search size={16} className="text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search store, street, landmark, or city..."
              className="w-full bg-transparent outline-none text-xs sm:text-sm font-semibold text-slate-800 dark:text-white placeholder-slate-400"
            />
            {search.trim() && (
              <button
                type="submit"
                disabled={isSearchingGeocode}
                className="text-[11px] font-bold text-orange-600 hover:text-orange-700 px-2 py-0.5 rounded-lg bg-orange-50 dark:bg-gray-800 shrink-0 cursor-pointer"
              >
                {isSearchingGeocode ? <Loader2 size={12} className="animate-spin" /> : "Go"}
              </button>
            )}
          </form>

          {/* Satellite Rooftop View Switcher */}
          <button
            type="button"
            onClick={() => setMapLayerType(mapLayerType === "streets" ? "satellite" : "streets")}
            title="Toggle Satellite View"
            className={`p-2.5 sm:p-3 rounded-2xl shadow-xl border transition pointer-events-auto shrink-0 cursor-pointer ${
              mapLayerType === "satellite"
                ? "bg-blue-600 text-white border-blue-700"
                : "bg-white/95 dark:bg-gray-900/95 text-slate-700 dark:text-gray-200 border-orange-100/80 dark:border-gray-800 hover:scale-105"
            }`}
          >
            <Eye size={18} />
          </button>

          {/* Live Locate Me GPS Button */}
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={isLocating}
            title="Center on my Live GPS"
            className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl shadow-xl border border-orange-100/80 dark:border-gray-800 transition hover:scale-105 pointer-events-auto text-blue-600 hover:text-blue-700 cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isLocating ? <Loader2 size={18} className="animate-spin text-blue-600" /> : <Locate size={18} />}
          </button>
        </div>

        {/* Quick Major Cities Teleport Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pointer-events-auto">
          {QUICK_CITIES.map((city) => (
            <button
              key={city.name}
              type="button"
              onClick={() => {
                setCustomCenter([city.lat, city.lng]);
                setSelectedShop(null);
              }}
              className="px-3 py-1 rounded-xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-white/60 dark:border-gray-800 shadow-md text-xs font-bold text-slate-700 dark:text-gray-200 hover:text-orange-600 transition shrink-0 cursor-pointer"
            >
              📍 {city.name}
            </button>
          ))}
        </div>

        {/* Status Toast Notification */}
        {statusToast && (
          <div className={`self-center px-4 py-1.5 rounded-full text-xs font-bold shadow-lg pointer-events-auto animate-in fade-in-50 ${
            statusToast.type === "success"
              ? "bg-emerald-600 text-white"
              : statusToast.type === "error"
              ? "bg-red-600 text-white"
              : "bg-blue-600 text-white"
          }`}>
            {statusToast.text}
          </div>
        )}
      </div>

      {/* Map Canvas (100% Free Leaflet / OpenStreetMap / Satellite) */}
      <div className="absolute inset-0 z-0">
        <MapComponent
          lat={mapCenter[0]}
          lng={mapCenter[1]}
          zoom={selectedShop ? 17 : 14}
          layerType={mapLayerType}
          originLocation={userLat !== null && userLng !== null ? { lat: userLat, lng: userLng } : null}
          markers={mapMarkers}
          selectedMarker={
            selectedShop
              ? {
                  id: selectedShop.id,
                  lat: selectedShop.latitude,
                  lng: selectedShop.longitude,
                  label: selectedShop.name,
                }
              : null
          }
          onMarkerClick={handleMarkerClick}
        />
      </div>

      {/* Selected Store Bottom Sheet Modal */}
      <AnimatePresence>
        {selectedShop && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/30 z-[450]"
              onClick={() => setSelectedShop(null)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute bottom-16 sm:bottom-0 lg:bottom-6 lg:top-24 lg:right-6 lg:left-auto lg:w-96 lg:rounded-3xl inset-x-0 z-[500] bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl p-5 border-t lg:border border-slate-200 dark:border-gray-800 max-h-[70vh] lg:max-h-[calc(100vh-8rem)] flex flex-col"
            >
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-gray-700 rounded-full mx-auto mb-3" />
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Store size={18} className="text-orange-500" />
                    {selectedShop.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                    {selectedShop.address}
                  </p>
                </div>
                <Link
                  href={`/shop?id=${selectedShop.id}`}
                  className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-sm transition active:scale-95 shrink-0"
                >
                  Visit Store
                </Link>
              </div>

              {/* Active Deals at this shop */}
              <div className="overflow-y-auto flex-1 space-y-2 pr-1">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Surplus Deals ({selectedShop.deals.length})
                </div>
                {selectedShop.deals.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 font-semibold bg-slate-50 dark:bg-gray-800 rounded-2xl">
                    No active surplus listings at this store today.
                  </div>
                ) : (
                  selectedShop.deals.map((deal) => (
                    <div
                      key={deal.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-200 relative shrink-0">
                          <Image
                            src={getSafeImageUrl(deal.front_image_url)}
                            alt={deal.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                            {deal.name}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="font-black text-emerald-600 dark:text-emerald-400">
                              ₹{deal.discount_price.toFixed(0)}
                            </span>
                            <span className="text-[10px] text-slate-400 line-through">
                              ₹{deal.original_price.toFixed(0)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Link
                        href={`/deals`}
                        className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition shadow-xs"
                      >
                        Reserve
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Legend / Help Overlay */}
      <div className="absolute bottom-20 left-4 z-[300] bg-white/90 dark:bg-gray-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/60 dark:border-gray-800 shadow-md text-[11px] font-bold text-slate-700 dark:text-gray-300 hidden sm:flex items-center gap-2 pointer-events-none">
        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
        <span>Your Location</span>
        <span className="w-2.5 h-2.5 rounded-full bg-[#FF5B26] inline-block ml-2" />
        <span>Surplus Store</span>
      </div>
    </div>
    </ShopperLayout>
  );
}
