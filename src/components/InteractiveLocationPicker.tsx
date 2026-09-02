"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { 
  MapPin, Navigation, Search, Check, Loader2, Compass, Locate, 
  Sparkles, SlidersHorizontal, Crosshair, Map, ExternalLink, ArrowRight,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Layers, Eye
} from "lucide-react";

interface InteractiveLocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  initialAddress?: string;
  onLocationChange: (loc: { lat: number; lng: number; address: string }) => void;
  label?: string;
  required?: boolean;
}

// Ultra-Visible HD Storefront Dropped Pin Icon
function createStorePin() {
  return new L.DivIcon({
    className: "custom-interactive-store-pin",
    html: `
      <div style="position: relative; width: 46px; height: 56px; display: flex; flex-direction: column; align-items: center; justify-content: center; transform: translate(-23px, -52px); cursor: grab; filter: drop-shadow(0 8px 16px rgba(0,0,0,0.5));">
        <!-- Pulsing Base Ring -->
        <span style="position: absolute; bottom: 0px; width: 32px; height: 32px; border-radius: 50%; background-color: rgba(255, 91, 38, 0.55); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
        
        <!-- Pin Body -->
        <div style="position: relative; width: 44px; height: 44px; border-radius: 50% 50% 50% 0; background: linear-gradient(135deg, #FF5B26 0%, #D83400 100%); transform: rotate(-45deg); border: 3.5px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 20px rgba(255,91,38,0.8);">
          <span style="transform: rotate(45deg); font-size: 20px; line-height: 1; user-select: none;">🏪</span>
        </div>
      </div>
    `,
    iconSize: [46, 56],
    iconAnchor: [23, 52],
    popupAnchor: [0, -52],
  });
}

// Map Click & Resize Handler
function MapEventsHandler({
  onPositionChange,
}: {
  onPositionChange: (lat: number, lng: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 600);

    const handleResize = () => map.invalidateSize();
    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", handleResize);
    };
  }, [map]);

  useMapEvents({
    click(e) {
      onPositionChange(e.latlng.lat, e.latlng.lng);
      map.flyTo(e.latlng, Math.max(map.getZoom(), 17), { animate: true, duration: 0.6 });
    },
  });

  return null;
}

// Smooth Map Recenter & Fly Controller
function MapRecenter({ lat, lng, zoom }: { lat: number; lng: number; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
      map.flyTo([lat, lng], zoom || map.getZoom() || 17, { animate: true, duration: 0.8 });
    }
  }, [map, lat, lng, zoom]);
  return null;
}

// Quick City Jump Catalog
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

export default function InteractiveLocationPicker({
  initialLat = 13.0827,
  initialLng = 80.2707,
  initialAddress = "",
  onLocationChange,
  label = "Storefront Physical Location (Direct Live HD Map)",
  required = true,
}: InteractiveLocationPickerProps) {
  const [lat, setLat] = useState<number>(initialLat);
  const [lng, setLng] = useState<number>(initialLng);
  const [address, setAddress] = useState<string>(initialAddress);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isGeolocating, setIsGeolocating] = useState<boolean>(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState<boolean>(false);
  const [searchStatusMsg, setSearchStatusMsg] = useState<{ type: "info" | "success" | "error"; text: string } | null>(null);
  const [showManualCoords, setShowManualCoords] = useState<boolean>(false);
  const [manualLatStr, setManualLatStr] = useState<string>(initialLat.toFixed(6));
  const [manualLngStr, setManualLngStr] = useState<string>(initialLng.toFixed(6));
  const [mapLayerType, setMapLayerType] = useState<"streets" | "satellite">("streets");

  const markerIcon = useMemo(() => createStorePin(), []);
  const markerRef = useRef<L.Marker | null>(null);

  // Parse raw text for coordinates or Google Maps links
  const extractCoordinatesFromText = (input: string): { lat: number; lng: number } | null => {
    const trimmed = input.trim();

    // 1. Check for decimal coordinates: "13.0827, 80.2707" or "13.0827 80.2707"
    const coordMatch = trimmed.match(/^([-+]?\d{1,2}(?:\.\d+)?)[,\s]+([-+]?\d{1,3}(?:\.\d+)?)$/);
    if (coordMatch) {
      const parsedLat = parseFloat(coordMatch[1]);
      const parsedLng = parseFloat(coordMatch[2]);
      if (parsedLat >= -90 && parsedLat <= 90 && parsedLng >= -180 && parsedLng <= 180) {
        return { lat: parsedLat, lng: parsedLng };
      }
    }

    // 2. Check for Google Maps URL coordinates
    const urlMatch = trimmed.match(/@([-+]?\d{1,2}\.\d+),([-+]?\d{1,3}\.\d+)/) || 
                     trimmed.match(/[?&]q=([-+]?\d{1,2}\.\d+),([-+]?\d{1,3}\.\d+)/) ||
                     trimmed.match(/destination=([-+]?\d{1,2}\.\d+),([-+]?\d{1,3}\.\d+)/);
    if (urlMatch) {
      const parsedLat = parseFloat(urlMatch[1]);
      const parsedLng = parseFloat(urlMatch[2]);
      if (parsedLat >= -90 && parsedLat <= 90 && parsedLng >= -180 && parsedLng <= 180) {
        return { lat: parsedLat, lng: parsedLng };
      }
    }

    return null;
  };

  // Reverse Geocode: lat/lng -> readable street address
  const fetchAddressFromCoords = useCallback(
    async (latitude: number, longitude: number) => {
      setIsReverseGeocoding(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
          {
            headers: {
              "Accept-Language": "en",
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          if (data && data.display_name) {
            const formatted = data.display_name;
            setAddress(formatted);
            onLocationChange({ lat: latitude, lng: longitude, address: formatted });
          }
        }
      } catch (err) {
        console.warn("Reverse geocode notice:", err);
      } finally {
        setIsReverseGeocoding(false);
      }
    },
    [onLocationChange]
  );

  // Position change trigger
  const handlePositionChange = useCallback(
    (newLat: number, newLng: number, skipLookup: boolean = false) => {
      const roundedLat = parseFloat(newLat.toFixed(6));
      const roundedLng = parseFloat(newLng.toFixed(6));
      setLat(roundedLat);
      setLng(roundedLng);
      setManualLatStr(roundedLat.toFixed(6));
      setManualLngStr(roundedLng.toFixed(6));
      setSearchResults([]);

      if (!skipLookup) {
        void fetchAddressFromCoords(roundedLat, roundedLng);
      } else {
        onLocationChange({ lat: roundedLat, lng: roundedLng, address });
      }
    },
    [address, fetchAddressFromCoords, onLocationChange]
  );

  // Micro-Nudge D-Pad: Shift coordinates by 10 meters in any direction
  const handleNudge = (direction: "north" | "south" | "east" | "west") => {
    const delta = 0.00009; // ~10 meters in latitude/longitude
    let targetLat = lat;
    let targetLng = lng;

    if (direction === "north") targetLat += delta;
    if (direction === "south") targetLat -= delta;
    if (direction === "east") targetLng += delta;
    if (direction === "west") targetLng -= delta;

    handlePositionChange(targetLat, targetLng);
  };

  // Apply manual coordinate inputs
  const handleApplyManualCoords = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedLat = parseFloat(manualLatStr);
    const parsedLng = parseFloat(manualLngStr);
    if (!isNaN(parsedLat) && !isNaN(parsedLng) && parsedLat >= -90 && parsedLat <= 90 && parsedLng >= -180 && parsedLng <= 180) {
      handlePositionChange(parsedLat, parsedLng);
      setSearchStatusMsg({ type: "success", text: `✓ Applied exact GPS coordinates: ${parsedLat.toFixed(5)}, ${parsedLng.toFixed(5)}` });
      setTimeout(() => setSearchStatusMsg(null), 4000);
    } else {
      setSearchStatusMsg({ type: "error", text: "Invalid coordinates. Latitude must be -90 to 90, Longitude -180 to 180." });
    }
  };

  // Real Live High-Accuracy Device GPS Detection
  const handleDetectLiveLocation = () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setSearchStatusMsg({
        type: "error",
        text: "Geolocation is not supported by your browser. Please type your street in the search box above.",
      });
      return;
    }

    setIsGeolocating(true);
    setSearchStatusMsg({
      type: "info",
      text: "📡 Scanning live GPS... (Click 'Allow' on your browser's location popup)",
    });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGeolocating(false);
        const { latitude, longitude, accuracy } = pos.coords;
        handlePositionChange(latitude, longitude);
        setSearchStatusMsg({
          type: "success",
          text: `✓ Live device GPS acquired (Accuracy: ±${Math.round(accuracy)}m). Drag pin or use arrows to fine-tune your door!`,
        });
        setTimeout(() => setSearchStatusMsg(null), 8000);
      },
      (err) => {
        console.warn("GPS request failed:", err);
        setIsGeolocating(false);
        if (err.code === 1) {
          setSearchStatusMsg({
            type: "error",
            text: "⚠️ Location access was blocked in your browser. Click the lock/tune icon in the browser address bar to Allow Location, or type your address above.",
          });
        } else {
          setSearchStatusMsg({
            type: "info",
            text: "⚠️ Device GPS timed out. Use the search bar or ⬆️ ⬇️ ⬅️ ➡️ arrow buttons to fine-tune your exact door.",
          });
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Smart Universal Search
  const handleSearchAddress = async (queryText?: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = (queryText || searchQuery).trim();
    if (!query) return;

    // 1. Direct coordinates or Google Maps link
    const directCoords = extractCoordinatesFromText(query);
    if (directCoords) {
      handlePositionChange(directCoords.lat, directCoords.lng);
      setSearchStatusMsg({ type: "success", text: `✓ Jumped to exact coordinates: ${directCoords.lat.toFixed(5)}, ${directCoords.lng.toFixed(5)}` });
      setTimeout(() => setSearchStatusMsg(null), 4000);
      return;
    }

    // 2. Geocode address via OpenStreetMap Nominatim
    setIsSearching(true);
    setSearchStatusMsg(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=6&addressdetails=1`,
        {
          headers: {
            "Accept-Language": "en",
          },
        }
      );
      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          setSearchResults(results);
          const top = results[0];
          const foundLat = parseFloat(top.lat);
          const foundLng = parseFloat(top.lon);
          const foundAddr = top.display_name;

          setLat(foundLat);
          setLng(foundLng);
          setAddress(foundAddr);
          onLocationChange({ lat: foundLat, lng: foundLng, address: foundAddr });
          setSearchStatusMsg({ type: "success", text: `✓ Found & Pinned: ${top.display_name.split(",")[0]}` });
          setTimeout(() => setSearchStatusMsg(null), 5000);
        } else {
          setSearchStatusMsg({ type: "error", text: `Could not find "${query}". Try searching your city, area, or 6-digit pincode.` });
        }
      }
    } catch (err) {
      setSearchStatusMsg({ type: "error", text: "Search request failed. Please check your network connection." });
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced autocomplete suggestions as user types
  useEffect(() => {
    const query = searchQuery.trim();
    if (!query || query.length < 3 || extractCoordinatesFromText(query)) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}&limit=5`,
          {
            headers: {
              "Accept-Language": "en",
            },
          }
        );
        if (res.ok) {
          const results = await res.json();
          setSearchResults(results || []);
        }
      } catch (err) {
        console.warn("Search fetch notice:", err);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div className="space-y-3.5">
      {/* Header & Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-gray-300">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="flex items-center gap-2">
          {/* Map Layer Switcher: Street vs High-Res Satellite */}
          <button
            type="button"
            onClick={() => setMapLayerType(mapLayerType === "streets" ? "satellite" : "streets")}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer ${
              mapLayerType === "satellite"
                ? "bg-blue-600 text-white shadow-blue-500/20"
                : "bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-200 hover:bg-slate-200"
            }`}
          >
            <Eye size={13} /> {mapLayerType === "satellite" ? "🛰️ Satellite (Active)" : "🛰️ Satellite Rooftop View"}
          </button>

          <button
            type="button"
            onClick={() => setShowManualCoords(!showManualCoords)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-[11px] font-bold text-slate-700 dark:text-gray-300 flex items-center gap-1 transition cursor-pointer"
          >
            <SlidersHorizontal size={12} /> {showManualCoords ? "Hide Lat/Lng" : "Paste Lat/Lng"}
          </button>

          <button
            type="button"
            onClick={() => void handleDetectLiveLocation()}
            disabled={isGeolocating}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 active:scale-95 text-white text-xs font-black transition shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isGeolocating ? <Loader2 size={13} className="animate-spin" /> : <Locate size={13} />}
            {isGeolocating ? "Locating..." : "📍 Locate Me (GPS)"}
          </button>
        </div>
      </div>

      {/* Manual Coordinate Fine-Tuning Box */}
      {showManualCoords && (
        <form onSubmit={handleApplyManualCoords} className="p-3 bg-orange-50/60 dark:bg-gray-850 rounded-2xl border border-orange-200 dark:border-gray-700 flex flex-wrap items-center gap-2 text-xs animate-in fade-in-50">
          <div className="flex-1 min-w-[120px]">
            <label className="block text-[10px] font-bold uppercase text-slate-600 dark:text-gray-400 mb-0.5">Latitude</label>
            <input
              type="text"
              value={manualLatStr}
              onChange={(e) => setManualLatStr(e.target.value)}
              placeholder="e.g. 13.082700"
              className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-xs font-mono font-bold"
            />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="block text-[10px] font-bold uppercase text-slate-600 dark:text-gray-400 mb-0.5">Longitude</label>
            <input
              type="text"
              value={manualLngStr}
              onChange={(e) => setManualLngStr(e.target.value)}
              placeholder="e.g. 80.270700"
              className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-xs font-mono font-bold"
            />
          </div>
          <button
            type="submit"
            className="self-end px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-lg transition cursor-pointer"
          >
            Apply Pin
          </button>
        </form>
      )}

      {/* Smart Universal Search Bar */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleSearchAddress(searchQuery);
                }
              }}
              placeholder="Type your area, street, landmark, pincode, or Google Maps link..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-slate-900 dark:text-white text-xs font-medium outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
            />
            <Search size={15} className="absolute left-3 top-3 text-slate-400" />
          </div>
          <button
            type="button"
            onClick={() => void handleSearchAddress(searchQuery)}
            disabled={isSearching || !searchQuery.trim()}
            className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 active:scale-95 text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-sm shrink-0"
          >
            {isSearching ? <Loader2 size={14} className="animate-spin" /> : <Compass size={14} />}
            Search & Pin
          </button>
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-[1200] mt-1 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-2xl max-h-56 overflow-y-auto p-1.5 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 flex items-center justify-between">
              <span>Matching Locations:</span>
              <button type="button" onClick={() => setSearchResults([])} className="hover:text-slate-600">✕ Dismiss</button>
            </div>
            {searchResults.map((res, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  const targetLat = parseFloat(res.lat);
                  const targetLng = parseFloat(res.lon);
                  setLat(targetLat);
                  setLng(targetLng);
                  setAddress(res.display_name);
                  setSearchResults([]);
                  onLocationChange({ lat: targetLat, lng: targetLng, address: res.display_name });
                }}
                className="w-full text-left p-2.5 rounded-xl hover:bg-orange-50 dark:hover:bg-gray-800 text-xs font-semibold text-slate-800 dark:text-gray-200 transition cursor-pointer flex items-center gap-2"
              >
                <MapPin size={14} className="text-orange-500 shrink-0" />
                <span className="truncate">{res.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick City Teleport Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
        <span className="text-slate-400 font-bold shrink-0">Major Hubs:</span>
        {QUICK_CITIES.map((city) => (
          <button
            key={city.name}
            type="button"
            onClick={() => {
              setLat(city.lat);
              setLng(city.lng);
              handlePositionChange(city.lat, city.lng);
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-gray-800 hover:bg-orange-100 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300 font-semibold transition shrink-0 cursor-pointer"
          >
            📍 {city.name}
          </button>
        ))}
      </div>

      {/* Search Status / Feedback Message */}
      {searchStatusMsg && (
        <p
          className={`text-[11px] font-semibold rounded-xl px-3.5 py-2 border animate-in fade-in-50 ${
            searchStatusMsg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/50"
              : searchStatusMsg.type === "error"
              ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:border-red-800/50"
              : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800/50"
          }`}
        >
          {searchStatusMsg.text}
        </p>
      )}

      {/* High-Definition 100% Free Leaflet & OpenStreetMap / Satellite Canvas */}
      <div className="relative w-full h-80 sm:h-96 rounded-3xl overflow-hidden border-2 border-orange-300 dark:border-gray-700 shadow-xl group">
        <MapContainer
          center={[lat, lng]}
          zoom={18}
          scrollWheelZoom={true}
          style={{ width: "100%", height: "100%" }}
        >
          {mapLayerType === "streets" ? (
            /* Official OpenStreetMap Global Street Map TileLayer */
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
          ) : (
            /* High-Resolution Global Satellite Aerial Photography TileLayer (100% Free - 0 Key) */
            <TileLayer
              attribution='&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
          )}

          <MapEventsHandler onPositionChange={handlePositionChange} />
          <MapRecenter lat={lat} lng={lng} zoom={18} />

          {/* 100m Precision Storefront Radius Circle */}
          <Circle
            center={[lat, lng]}
            radius={60}
            pathOptions={{
              color: "#FF5B26",
              fillColor: "#FF5B26",
              fillOpacity: 0.15,
              weight: 2,
              dashArray: "4 6",
            }}
          />

          {/* Ultra-Prominent Store Pin Marker */}
          <Marker
            position={[lat, lng]}
            icon={markerIcon}
            draggable={true}
            ref={markerRef}
            eventHandlers={{
              dragend: () => {
                const marker = markerRef.current;
                if (marker) {
                  const newPos = marker.getLatLng();
                  handlePositionChange(newPos.lat, newPos.lng);
                }
              },
            }}
          >
            <Popup className="custom-store-popup">
              <div className="p-1 text-center font-sans">
                <div className="text-xs font-black text-orange-600 mb-0.5">🏪 Storefront Pin</div>
                <div className="text-[11px] text-slate-600 leading-snug">{address || "Selected Storefront Location"}</div>
                <div className="text-[10px] text-slate-400 mt-1 font-mono">{lat.toFixed(5)}, {lng.toFixed(5)}</div>
              </div>
            </Popup>
          </Marker>
        </MapContainer>

        {/* Live Coordinate Badge Overlay */}
        <div className="absolute top-3 left-3 z-[1000] bg-white/95 dark:bg-gray-900/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 shadow-md flex items-center gap-2 pointer-events-none">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-bold text-slate-800 dark:text-white font-mono">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </span>
        </div>

        {/* Micro-Adjustment D-Pad (Directional 10-meter Nudge Buttons) */}
        <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 dark:bg-gray-900/95 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-xl flex flex-col items-center gap-0.5">
          <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider mb-0.5">Fine-Tune 10m</span>
          <button
            type="button"
            onClick={() => handleNudge("north")}
            title="Nudge North 10m"
            className="w-7 h-7 bg-slate-100 hover:bg-orange-500 hover:text-white dark:bg-gray-800 rounded-lg flex items-center justify-center text-slate-700 dark:text-gray-200 transition cursor-pointer"
          >
            <ChevronUp size={16} />
          </button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleNudge("west")}
              title="Nudge West 10m"
              className="w-7 h-7 bg-slate-100 hover:bg-orange-500 hover:text-white dark:bg-gray-800 rounded-lg flex items-center justify-center text-slate-700 dark:text-gray-200 transition cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-black">
              🎯
            </div>
            <button
              type="button"
              onClick={() => handleNudge("east")}
              title="Nudge East 10m"
              className="w-7 h-7 bg-slate-100 hover:bg-orange-500 hover:text-white dark:bg-gray-800 rounded-lg flex items-center justify-center text-slate-700 dark:text-gray-200 transition cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => handleNudge("south")}
            title="Nudge South 10m"
            className="w-7 h-7 bg-slate-100 hover:bg-orange-500 hover:text-white dark:bg-gray-800 rounded-lg flex items-center justify-center text-slate-700 dark:text-gray-200 transition cursor-pointer"
          >
            <ChevronDown size={16} />
          </button>
        </div>

        {/* Click/Drag Helper Tip Overlay */}
        <div className="absolute bottom-3 right-3 z-[1000] bg-slate-900/85 text-white backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-bold shadow-md flex items-center gap-1 pointer-events-none">
          <span>👆 Drag pin or click map to set exact door</span>
        </div>
      </div>

      {/* Store Address Textarea with "Pin Written Address" Button */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="block text-[11px] font-bold text-slate-600 dark:text-gray-400">
            Store Physical Address
          </label>
          <div className="flex items-center gap-2">
            {isReverseGeocoding && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600">
                <Loader2 size={11} className="animate-spin" /> Fetching street...
              </span>
            )}
            {address && (
              <button
                type="button"
                onClick={() => void handleSearchAddress(address)}
                className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
              >
                <Compass size={12} /> Pin Written Address on Map
              </button>
            )}
          </div>
        </div>
        <textarea
          rows={2}
          required={required}
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            onLocationChange({ lat, lng, address: e.target.value });
          }}
          placeholder="Click anywhere on the map or type your address here, then click 'Pin Written Address'..."
          className="w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/80 dark:bg-gray-900/80 text-slate-900 dark:text-white px-3.5 py-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none transition"
        />
      </div>
    </div>
  );
}
