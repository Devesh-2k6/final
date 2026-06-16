"use client";

import { useEffect, useState, useRef } from "react";
import { 
  APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useAdvancedMarkerRef 
} from "@vis.gl/react-google-maps";
import { 
  MapPin, Navigation, Sliders, Locate, Store, Info, CircleDot, AlertTriangle 
} from "lucide-react";
import { Product } from "@/services/products";
import { Shop } from "@/services/shops";

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

const API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_PLATFORM_KEY ||
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  "";

const hasValidKey = Boolean(API_KEY) && API_KEY !== "YOUR_API_KEY";

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
  onReserveProduct
}: DealsMapProps) {
  const [activeShopInfo, setActiveShopInfo] = useState<Shop | null>(null);
  const [infoWindowOpen, setInfoWindowOpen] = useState(false);
  const selectedMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  // Group products by shop
  const shopListingCounts = products.reduce((acc, p) => {
    acc[p.shop_id] = (acc[p.shop_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Filter shops that have listing counts > 0
  const activeShops = shops.filter(shop => (shopListingCounts[shop.id] || 0) > 0);

  // Default coordinate (Bengaluru center)
  const defaultCenter = { lat: 12.9716, lng: 77.5946 };
  const currentCenter = userLocation || defaultCenter;

  // Request browser geolocation
  const handleLocateMe = () => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.warn("Geolocation access denied or failed. Defaulting to pre-set location.", error);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  };

  // Drag user location marker handler
  const handleUserMarkerDragEnd = (event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      setUserLocation({
        lat: event.latLng.lat(),
        lng: event.latLng.lng(),
      });
    }
  };

  if (!hasValidKey) {
    return (
      <div id="maps-setup-banner" className="bg-[#1A1A1C] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl" />
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl">
            <AlertTriangle size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold">Google Maps API Key Required</h3>
            <p className="text-xs text-gray-400 leading-normal max-w-lg">
              To view real-time grocer coordinates and calculate exact proximity for food rescue deals, configure a Google Maps API Key.
            </p>
          </div>
        </div>

        <div className="border-t border-white/5 pt-5 space-y-4">
          <p className="text-xs font-bold text-gray-300">Quick Setup Instructions:</p>
          <ol className="text-xs text-gray-400 space-y-3 list-decimal list-inside leading-loose">
            <li>
              Get an API Key from the {" "}
              <a 
                href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" 
                target="_blank" 
                rel="noopener"
                className="text-emerald-400 hover:underline font-extrabold"
              >
                Google Cloud Console
              </a>
            </li>
            <li>
              Open <strong className="text-gray-200">Settings</strong> (⚙️ gear icon, top-right corner) in AI Studio
            </li>
            <li>
              Go to <strong className="text-gray-200">Secrets</strong>, add a secret named{" "}
              <code className="bg-white/5 px-1.5 py-0.5 rounded text-amber-400">GOOGLE_MAPS_PLATFORM_KEY</code>
            </li>
            <li>Paste your API key and save. The application will rebuild automatically!</li>
          </ol>
        </div>

        {/* Mock/Simulated visual indicator for map view */}
        <div className="border border-white/5 bg-[#111111] p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-400">
              <Store size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Interactive Proximity Mode</p>
              <p className="text-[10px] text-gray-500">Currently active on fallback database coordinates</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={handleLocateMe}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-4 rounded-xl transition flex items-center gap-1.5"
          >
            <Locate size={12} /> Enable GPS Simulation
          </button>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={API_KEY} version="weekly">
      <div id="google-maps-dashboard" className="space-y-4">
        {/* Controls Panel */}
        <div className="bg-[#1A1A1C] border border-white/5 rounded-3xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Proximity Filter Slider */}
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Sliders size={18} />
            </div>
            <div className="space-y-1 flex-1 md:flex-none md:w-64">
              <div className="flex justify-between text-xs font-bold text-gray-400">
                <span>Rescue Radius</span>
                <span className="text-emerald-400">
                  {maxDistance === 999 ? "All Deals" : `${maxDistance} km`}
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
                className="w-full accent-emerald-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* User Address Indicator & Location Search */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={handleLocateMe}
              className="bg-white/5 border border-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs py-2.5 px-4 rounded-xl transition flex items-center gap-2 cursor-pointer"
              title="Get current browser location"
            >
              <Locate size={14} className="text-emerald-400" /> Locate Me
            </button>
            <span className="text-xs text-gray-400 py-2 sm:py-0">
              📍 Drag <strong className="text-white">Blue Pin</strong> to adjust rescue origin
            </span>
          </div>
        </div>

        {/* Map Layout */}
        <div className="relative border border-white/5 bg-[#1A1A1C] rounded-3xl overflow-hidden shadow-2xl h-[420px] w-full">
          <Map
            defaultCenter={defaultCenter}
            center={currentCenter}
            defaultZoom={13}
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
            style={{ width: "100%", height: "100%" }}
            gestureHandling="cooperative"
            disableDefaultUI
          >
            {/* Draggable User Location Marker */}
            <AdvancedMarker 
              position={currentCenter} 
              draggable={true} 
              onDragEnd={handleUserMarkerDragEnd}
              title="Your rescue position (drag to move)"
            >
              <Pin background="#3b82f6" glyphColor="#ffffff" borderColor="#1d4ed8" scale={1.2}>
                <Navigation size={12} className="text-white" />
              </Pin>
            </AdvancedMarker>

            {/* Shop Markers */}
            {activeShops.map((shop) => {
              const distance = userLocation 
                ? getDistanceInKm(userLocation.lat, userLocation.lng, shop.latitude, shop.longitude)
                : 0;

              // Check if within radius
              const isWithinRadius = maxDistance === 999 || distance <= maxDistance;
              if (!isWithinRadius) return null;

              const dealCount = shopListingCounts[shop.id] || 0;

              return (
                <AdvancedMarker
                  key={shop.id}
                  position={{ lat: shop.latitude, lng: shop.longitude }}
                  title={shop.name}
                  onClick={(e) => {
                    setActiveShopInfo(shop);
                    setInfoWindowOpen(true);
                    onSelectShop(shop.id);
                  }}
                >
                  <Pin 
                    background={selectedShopId === shop.id ? "#10b981" : "#f59e0b"} 
                    glyphColor="#ffffff" 
                    scale={1.1}
                  >
                    <span className="text-[10px] font-black text-white">{dealCount}</span>
                  </Pin>
                </AdvancedMarker>
              );
            })}

            {/* InfoWindow for Clicked Shop */}
            {infoWindowOpen && activeShopInfo && (
              <InfoWindow
                position={{ lat: activeShopInfo.latitude, lng: activeShopInfo.longitude }}
                onCloseClick={() => {
                  setInfoWindowOpen(false);
                  setActiveShopInfo(null);
                  onSelectShop(null);
                }}
              >
                <div className="text-gray-900 p-1.5 max-w-64 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-sm tracking-tight text-gray-900">{activeShopInfo.name}</h4>
                      <p className="text-[10px] text-gray-500">{activeShopInfo.address}</p>
                    </div>
                    {userLocation && (
                      <span className="bg-emerald-50 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap">
                        {getDistanceInKm(userLocation.lat, userLocation.lng, activeShopInfo.latitude, activeShopInfo.longitude).toFixed(1)} km away
                      </span>
                    )}
                  </div>

                  <div className="border-t border-gray-100 pt-2 space-y-1.5">
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Active Deals</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {products
                        .filter((p) => p.shop_id === activeShopInfo.id && p.quantity > 0)
                        .map((p) => (
                          <div key={p.id} className="flex justify-between items-center text-xs bg-gray-50 p-1.5 rounded-lg border border-gray-100">
                            <span className="font-semibold text-gray-800 truncate max-w-[120px]">{p.name}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-emerald-600">${p.discount_price.toFixed(2)}</span>
                              <button
                                type="button"
                                onClick={() => onReserveProduct(p)}
                                className="bg-emerald-600 text-white rounded-md text-[9px] font-bold px-1.5 py-0.5 hover:bg-emerald-500 transition cursor-pointer"
                              >
                                Reserve
                              </button>
                            </div>
                          </div>
                      ))}
                    </div>
                  </div>
                </div>
              </InfoWindow>
            )}
          </Map>

          {/* Quick Guide Overlay */}
          <div className="absolute bottom-3 left-3 bg-[#111112]/95 border border-white/5 backdrop-blur-md rounded-2xl p-2.5 max-w-xs text-[10px] text-gray-400 space-y-0.5 pointer-events-none">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
              <span>Your Search Origin</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              <span>Available Food Shop</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>Selected Store</span>
            </div>
          </div>
        </div>
      </div>
    </APIProvider>
  );
}
