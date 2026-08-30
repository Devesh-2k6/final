"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search, Filter, MapPin, Loader2, Navigation, Locate, Store, Compass } from "lucide-react";
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
import { BottomNav } from "@/components/BottomNav";

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

const DEFAULT_SHOPS: ShopWithDescription[] = [
  {
    id: "e65aecd1-6519-4bb1-af62-7a2999c51ebb",
    name: "Green Valley Supermarket",
    address: "123 Anna Salai, Downtown Chennai",
    latitude: 13.0827,
    longitude: 80.2707,
    deal_count: 5,
    average_rating: 4.8,
    rating_count: 24,
  },
  {
    id: "2b8aa537-400e-4046-8e7a-d6092318b467",
    name: "Fresh Mart Express",
    address: "456 Usman Road, T. Nagar, Chennai",
    latitude: 13.0406,
    longitude: 80.2443,
    deal_count: 3,
    average_rating: 4.6,
    rating_count: 18,
  },
  {
    id: "2310de50-02b2-4987-87a7-7784758ff5e2",
    name: "Daily Bazaar",
    address: "789 Nungambakkam High Road, Chennai",
    latitude: 13.0598,
    longitude: 80.2206,
    deal_count: 4,
    average_rating: 4.9,
    rating_count: 32,
  },
];

type SelectedShop = ShopWithDescription & { deals: ApiProduct[] };

export default function MapDiscovery() {
  const [shops, setShops] = useState<ShopWithDescription[]>(DEFAULT_SHOPS);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("ready");
  const [selectedShop, setSelectedShop] = useState<SelectedShop | null>(null);
  const [search, setSearch] = useState("");
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    fetchIpGeolocation()
      .then((data) => {
        setUserLat(data.latitude);
        setUserLng(data.longitude);
      })
      .catch((err) => console.error("Map IP geolocation failed:", err));
  }, []);

  const handleLocateMe = () => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
          setIsLocating(false);
        },
        (err) => {
          console.warn("GPS failed, falling back to IP:", err);
          fetchIpGeolocation()
            .then((data) => {
              setUserLat(data.latitude);
              setUserLng(data.longitude);
            })
            .catch(() => alert("Could not determine location."))
            .finally(() => setIsLocating(false));
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setIsLocating(false);
    }
  };

  const load = useCallback(async () => {
    try {
      const fetchPromise = Promise.all([
        listShops(),
        getProducts({ hideExpired: true }),
      ]);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 4000)
      );

      const [shopList, productList] = await Promise.race([fetchPromise, timeoutPromise]);
      if (shopList && shopList.length > 0) {
        setShops(shopList);
      }
      setProducts(productList || []);
      setStatus("ready");
    } catch (e) {
      console.warn("Using fallback map shops:", e);
      setShops(DEFAULT_SHOPS);
      setStatus("ready");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredShops = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return shops;
    return shops.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q)
    );
  }, [shops, search]);

  const mapCenter = useMemo((): [number, number] => {
    if (selectedShop) {
      return [selectedShop.latitude, selectedShop.longitude];
    }
    if (filteredShops.length > 0) {
      const lat =
        filteredShops.reduce((sum, s) => sum + s.latitude, 0) / filteredShops.length;
      const lng =
        filteredShops.reduce((sum, s) => sum + s.longitude, 0) / filteredShops.length;
      return [lat, lng];
    }
    if (userLat !== null && userLng !== null) {
      return [userLat, userLng];
    }
    return [13.0827, 80.2707];
  }, [filteredShops, selectedShop, userLat, userLng]);

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
    <div className="h-screen w-full relative overflow-hidden bg-[#F4FBF7] text-slate-800">
      {/* Top Header Floating Search Bar */}
      <div className="absolute top-0 inset-x-0 z-[400] p-4 pt-safe flex items-center gap-2.5 pointer-events-none">
        <Link
          href="/deals"
          className="bg-white/90 backdrop-blur-md p-3 rounded-full shadow-lg border border-orange-100/60 transition hover:scale-105 pointer-events-auto text-slate-700 hover:text-[#FF5B26]"
          aria-label="Back to deals"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-orange-100/60 flex items-center px-4 py-2.5 pointer-events-auto focus-within:border-[#FF5B26] focus-within:ring-2 focus-within:ring-orange-500/20 transition-all">
          <Search size={17} className="text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search surplus stores & addresses..."
            className="w-full bg-transparent outline-none text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400"
          />
        </div>
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={isLocating}
          title="Find my location"
          className="bg-white/90 backdrop-blur-md p-3 rounded-full shadow-lg border border-orange-100/60 transition hover:scale-105 pointer-events-auto text-blue-600 hover:text-blue-700 cursor-pointer disabled:opacity-50 shrink-0"
        >
          {isLocating ? <Loader2 size={18} className="animate-spin text-blue-600" /> : <Locate size={18} />}
        </button>
      </div>

      {/* Map Canvas */}
      <div className="absolute inset-0 z-0">
        <MapComponent
          lat={mapCenter[0]}
          lng={mapCenter[1]}
          zoom={selectedShop ? 15 : filteredShops.length <= 1 ? 14 : 13}
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

      {/* Selected Store Bottom Sheet */}
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
              className="absolute bottom-16 inset-x-0 z-[500] bg-white/95 dark:bg-gray-900/95 backdrop-blur-3xl rounded-t-[2.5rem] shadow-[0_-15px_40px_rgba(16,185,129,0.08)] border-t border-emerald-100/50 p-6 pb-6 max-h-[55vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-gray-700 rounded-full mx-auto mb-5" />
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    {selectedShop.name}
                  </h2>
                  <p className="text-slate-500 dark:text-gray-400 mt-1 text-xs sm:text-sm font-medium">
                    {selectedShop.address}
                  </p>
                </div>
                <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider">
                  {selectedShop.deals.length || selectedShop.deal_count || 0} Deals
                </div>
              </div>

              {/* Deal Cards Carousels */}
              <div className="flex gap-3.5 overflow-x-auto pb-4 -mx-6 px-6 scrollbar-hide">
                {selectedShop.deals.slice(0, 8).map((p) => (
                  <div
                    key={p.id}
                    className="min-w-[140px] bg-[#F4FBF7] dark:bg-gray-800/60 rounded-2xl p-3 border border-emerald-100/60 dark:border-gray-700 flex-shrink-0"
                  >
                    <div className="h-20 w-full bg-white dark:bg-gray-900 rounded-xl mb-2.5 overflow-hidden relative border border-emerald-100/40 dark:border-gray-700">
                      <Image
                        src={getSafeImageUrl(p.front_image_url)}
                        alt={p.name}
                        fill
                        sizes="140px"
                        className="object-cover"
                      />
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white mb-1 line-clamp-1">
                      {p.name}
                    </h4>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">
                        ₹{p.discount_price.toFixed(0)}
                      </span>
                      <span className="text-[10px] text-slate-400 line-through">
                        ₹{p.original_price.toFixed(0)}
                      </span>
                    </div>
                  </div>
                ))}
                {selectedShop.deals.length === 0 && (
                  <p className="text-xs text-slate-400 py-3 font-medium pl-2">No active deals at this shop right now.</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-3">
                <button
                  type="button"
                  onClick={() => {
                    const lat = selectedShop.latitude;
                    const lng = selectedShop.longitude;
                    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
                    window.open(url, "_blank");
                  }}
                  className="flex-1 bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-500/30 hover:border-[#FF5B26] text-[#FF5B26] dark:text-orange-400 font-black py-3.5 rounded-2xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm"
                >
                  <Navigation size={16} className="fill-[#FF5B26] dark:fill-orange-400" />
                  Get Directions
                </button>
                <Link
                  href="/deals"
                  className="flex-[1.4] bg-[#FF5B26] hover:bg-[#E54B18] text-white font-black py-3.5 rounded-2xl shadow-lg shadow-orange-500/25 transition text-center flex items-center justify-center text-xs sm:text-sm"
                >
                  Browse All Deals
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
