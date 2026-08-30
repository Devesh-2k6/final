"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, Navigation, Loader2, CheckCircle2, MapPin, Sparkles } from "lucide-react";

function createDraggableShopIcon() {
  return new L.DivIcon({
    className: "custom-draggable-shop-marker",
    html: `
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        top: -22px;
        left: -22px;
        cursor: grab;
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
          border: 3px solid white;
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.5);
          color: white;
          font-size: 14px;
        ">📍</span>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
}

function MapEventsHandler({
  onMapClick,
}: {
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyToLocation({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      map.flyTo([lat, lng], zoom, { animate: true, duration: 1.2 });
    }
  }, [lat, lng, zoom, map]);

  useEffect(() => {
    map.invalidateSize();
    const t = setTimeout(() => map.invalidateSize(), 300);
    return () => clearTimeout(t);
  }, [map]);

  return null;
}

export type InteractiveMapPickerProps = {
  initialLat?: number;
  initialLng?: number;
  initialAddress?: string;
  onLocationSelect: (loc: { lat: number; lng: number; address?: string }) => void;
  shopName?: string;
  className?: string;
};

export default function LeafletInteractiveMapPicker({
  initialLat = 13.0827,
  initialLng = 80.2707,
  initialAddress = "",
  onLocationSelect,
  shopName = "Your Store",
  className = "w-full h-80 sm:h-96",
}: InteractiveMapPickerProps) {
  const [lat, setLat] = useState<number>(initialLat);
  const [lng, setLng] = useState<number>(initialLng);
  const [zoom, setZoom] = useState(15);
  const [searchQuery, setSearchQuery] = useState(initialAddress);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [detectedAddress, setDetectedAddress] = useState(initialAddress);
  const [suggestions, setSuggestions] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);

  const markerRef = useRef<L.Marker | null>(null);
  const shopIcon = createDraggableShopIcon();

  // Reverse geocode whenever pin changes
  const reverseGeocode = useCallback(
    async (latitude: number, longitude: number) => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
          { headers: { "User-Agent": "ExpiryGo-App/1.0" } }
        );
        const data = await res.json();
        if (data && data.display_name) {
          setDetectedAddress(data.display_name);
          setSearchQuery(data.display_name);
          onLocationSelect({ lat: latitude, lng: longitude, address: data.display_name });
          return;
        }
      } catch {
        // Fallback silently if offline/network error
      }
      onLocationSelect({ lat: latitude, lng: longitude });
    },
    [onLocationSelect]
  );

  // Sync props when initialLat/initialLng changes from parent preset button
  useEffect(() => {
    if (initialLat && initialLng && (initialLat !== lat || initialLng !== lng)) {
      setLat(initialLat);
      setLng(initialLng);
      if (initialAddress) {
        setDetectedAddress(initialAddress);
        setSearchQuery(initialAddress);
      }
    }
  }, [initialLat, initialLng, initialAddress]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMapClick = (newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
    reverseGeocode(newLat, newLng);
  };

  const handleMarkerDragEnd = () => {
    const marker = markerRef.current;
    if (marker) {
      const pos = marker.getLatLng();
      setLat(pos.lat);
      setLng(pos.lng);
      reverseGeocode(pos.lat, pos.lng);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery.trim()
        )}&limit=5`,
        { headers: { "User-Agent": "ExpiryGo-App/1.0" } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        setSuggestions(data);
        const first = data[0];
        const newLat = parseFloat(first.lat);
        const newLng = parseFloat(first.lon);
        setLat(newLat);
        setLng(newLng);
        setZoom(16);
        setDetectedAddress(first.display_name);
        onLocationSelect({ lat: newLat, lng: newLng, address: first.display_name });
      } else {
        alert("Location not found. Please try searching with city name (e.g., 'T. Nagar, Chennai').");
      }
    } catch {
      alert("Failed to search location. Please check your internet connection.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSuggestion = (sug: { display_name: string; lat: string; lon: string }) => {
    const newLat = parseFloat(sug.lat);
    const newLng = parseFloat(sug.lon);
    setLat(newLat);
    setLng(newLng);
    setZoom(16);
    setDetectedAddress(sug.display_name);
    setSearchQuery(sug.display_name);
    setSuggestions([]);
    onLocationSelect({ lat: newLat, lng: newLng, address: sug.display_name });
  };

  const handleLocateMe = () => {
    if (!("geolocation" in navigator)) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        setLat(userLat);
        setLng(userLng);
        setZoom(17);
        setIsLocating(false);
        reverseGeocode(userLat, userLng);
      },
      (err) => {
        setIsLocating(false);
        alert(`Could not retrieve GPS location: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-3">
      {/* Search Bar & Locate Me Button */}
      <div className="flex gap-2 relative z-30">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch();
              }
            }}
            placeholder="Search address, landmark, or street name..."
            className="w-full bg-white dark:bg-gray-900 border border-emerald-200 dark:border-gray-700 rounded-2xl px-4 py-3 pl-10 text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm"
          />
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        <button
          type="button"
          onClick={() => handleSearch()}
          disabled={isSearching || !searchQuery.trim()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 rounded-2xl transition flex items-center gap-1.5 text-xs disabled:opacity-50 cursor-pointer shadow-sm"
        >
          {isSearching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          Find
        </button>

        <button
          type="button"
          onClick={handleLocateMe}
          disabled={isLocating}
          title="Use my current GPS location"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 rounded-2xl transition flex items-center gap-1.5 text-xs disabled:opacity-50 cursor-pointer shadow-sm"
        >
          {isLocating ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
          <span className="hidden sm:inline">GPS</span>
        </button>
      </div>

      {/* Search Auto-complete Suggestions Dropdown */}
      {suggestions.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-emerald-200 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden z-40 relative max-h-48 overflow-y-auto">
          {suggestions.map((sug, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelectSuggestion(sug)}
              className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-none flex items-center gap-2 transition cursor-pointer"
            >
              <MapPin size={13} className="text-emerald-500 flex-shrink-0" />
              <span className="truncate">{sug.display_name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Interactive Map Box */}
      <div className={`relative rounded-3xl overflow-hidden border-2 border-emerald-500/30 shadow-lg shadow-emerald-950/5 ${className}`}>
        <MapContainer
          center={[lat, lng]}
          zoom={zoom}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
          attributionControl={false}
        >
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {/* 100-meter verification halo radius */}
          <Circle
            center={[lat, lng]}
            radius={100}
            pathOptions={{
              color: "#10b981",
              fillColor: "#10b981",
              fillOpacity: 0.12,
              weight: 2,
              dashArray: "4, 6",
            }}
          />

          {/* Draggable Shop Marker */}
          <Marker
            position={[lat, lng]}
            draggable
            icon={shopIcon}
            ref={markerRef}
            eventHandlers={{
              dragend: handleMarkerDragEnd,
            }}
          >
            <Popup>
              <div className="p-1 text-center">
                <p className="font-extrabold text-xs text-slate-900">{shopName}</p>
                <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Drag to adjust exact entrance</p>
              </div>
            </Popup>
          </Marker>

          <MapEventsHandler onMapClick={handleMapClick} />
          <FlyToLocation lat={lat} lng={lng} zoom={zoom} />
        </MapContainer>

        {/* Floating Controls Badge */}
        <div className="absolute bottom-3 left-3 right-3 z-[1000] pointer-events-none flex items-center justify-between">
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-200/80 dark:border-gray-700 text-[11px] font-bold text-slate-700 dark:text-gray-300 shadow-md flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-mono">{lat.toFixed(5)}, {lng.toFixed(5)}</span>
          </div>

          <div className="bg-emerald-600 text-white font-black text-[10px] uppercase tracking-wider px-2.5 py-1.5 rounded-xl shadow-md flex items-center gap-1">
            <CheckCircle2 size={12} /> Click / Drag to Pinpoint
          </div>
        </div>
      </div>
    </div>
  );
}
