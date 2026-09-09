"use client";

import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import { Store, Tag, ArrowRight } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { listShops, type ShopWithDescription } from "@/services/shops";

const DEFAULT_SHOPS: ShopWithDescription[] = [
  {
    id: "shop-1",
    name: "Green Valley Supermarket",
    address: "123 Anna Salai, Downtown Chennai",
    latitude: 13.0827,
    longitude: 80.2707,
    deal_count: 5,
    average_rating: 4.8,
    rating_count: 24,
  },
  {
    id: "shop-2",
    name: "Fresh Mart Express",
    address: "456 Usman Road, T. Nagar, Chennai",
    latitude: 13.0406,
    longitude: 80.2443,
    deal_count: 3,
    average_rating: 4.6,
    rating_count: 18,
  },
  {
    id: "shop-3",
    name: "Daily Bazaar",
    address: "789 Nungambakkam High Road, Chennai",
    latitude: 13.0598,
    longitude: 80.2206,
    deal_count: 4,
    average_rating: 4.9,
    rating_count: 32,
  },
];

function createShopIcon(dealCount: number = 1) {
  return new L.DivIcon({
    className: "hero-shop-pin",
    html: `
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        top: -18px;
        left: -18px;
        cursor: pointer;
      ">
        <span style="
          position: absolute;
          display: inline-flex;
          height: 100%;
          width: 100%;
          border-radius: 50%;
          background-color: #10b981;
          opacity: 0.35;
          animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></span>
        <span style="
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          height: 28px;
          width: 28px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border: 2.5px solid white;
          box-shadow: 0 8px 18px rgba(16,185,129,0.45);
          color: white;
          font-family: -apple-system, sans-serif;
          font-size: 11px;
          font-weight: 900;
        ">${dealCount}</span>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

function InvalidateSizeHandler() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map]);
  return null;
}

export default function LeafletHeroMap() {
  const [shops, setShops] = useState<ShopWithDescription[]>(DEFAULT_SHOPS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listShops()
      .then((data) => {
        if (data && data.length > 0) {
          const active = data.filter((s) => s.deal_count && s.deal_count > 0);
          setShops(active.length > 0 ? active : data);
        }
      })
      .catch((err) => {
        console.warn("Using fallback shops for HeroMap:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  const center: [number, number] = useMemo(() => {
    if (shops.length > 0) {
      const lat = shops.reduce((acc, s) => acc + s.latitude, 0) / shops.length;
      const lng = shops.reduce((acc, s) => acc + s.longitude, 0) / shops.length;
      return [lat, lng];
    }
    return [13.0827, 80.2707];
  }, [shops]);

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={false}
        attributionControl={false}
        style={{ height: "100%", width: "100%", borderRadius: "inherit" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />

        <InvalidateSizeHandler />

        {shops.map((shop) => (
          <Marker
            key={shop.id}
            position={[shop.latitude, shop.longitude]}
            icon={createShopIcon(shop.deal_count || 1)}
          >
            <Popup className="hero-popup">
              <div className="p-1 max-w-[200px] text-left">
                <div className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-600 tracking-wider mb-1">
                  <Tag size={12} /> {shop.deal_count || 1} Active {(shop.deal_count || 1) === 1 ? "Deal" : "Deals"}
                </div>
                <div className="font-bold text-sm text-slate-900 leading-snug">{shop.name}</div>
                <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">{shop.address}</div>
                <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-amber-600">⭐ {shop.average_rating?.toFixed(1) || "4.8"}</span>
                  <Link
                    href="/deals"
                    className="inline-flex items-center gap-0.5 text-xs font-black text-emerald-600 hover:text-emerald-700 underline"
                  >
                    View Deals <ArrowRight size={11} />
                  </Link>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Floating Radar Badge */}
      <div className="absolute bottom-4 left-4 z-[400] bg-white/95 dark:bg-gray-900/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800/60 shadow-lg flex items-center gap-2 pointer-events-none">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
        <span className="text-[10px] font-extrabold text-slate-800 dark:text-emerald-300 uppercase tracking-widest">
          Live Deals Radar • {shops.length} Shops
        </span>
      </div>

      {loading && (
        <div className="absolute inset-0 bg-emerald-50/20 backdrop-blur-[1px] z-[450] flex items-center justify-center pointer-events-none">
          <div className="bg-white/90 dark:bg-gray-900/90 px-4 py-2 rounded-full shadow-lg border border-emerald-100 dark:border-emerald-800 flex items-center gap-2">
            <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Scanning local stores...</span>
          </div>
        </div>
      )}
    </div>
  );
}
