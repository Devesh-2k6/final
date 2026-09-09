"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  MapPin,
  Search,
  Crosshair,
  Loader2,
  CheckCircle2,
  Navigation,
  Compass,
  Building2,
  Sparkles,
} from "lucide-react";
import { fetchIpGeolocation } from "@/lib/geolocation";
import type { LatLngExpression, LeafletMouseEvent, Marker as LeafletMarkerType } from "leaflet";

export interface LocationPickerValue {
  latitude: number;
  longitude: number;
  address?: string;
  matchedName?: string;
}

export interface InteractiveMapPickerProps {
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
  onChange?: (value: LocationPickerValue) => void;
  initialLat?: number | null;
  initialLng?: number | null;
  initialAddress?: string;
  shopName?: string;
  onLocationSelect?: (loc: { lat: number; lng: number; address?: string }) => void;
  className?: string;
  zoom?: number;
}

const PRESET_LANDMARKS = [
  {
    name: "Spencer Plaza, Chennai",
    shortLabel: "🏪 Spencer Plaza (Chennai)",
    lat: 13.06158,
    lon: 80.26094,
    address: "Anna Salai, Triplicane, Chennai, Tamil Nadu, 600002, India",
  },
  {
    name: "Connaught Place, New Delhi",
    shortLabel: "🏛️ Connaught Place (Delhi)",
    lat: 28.6304,
    lon: 77.2177,
    address: "Connaught Place, New Delhi, Delhi, 110001, India",
  },
  {
    name: "MG Road, Bengaluru",
    shortLabel: "🥗 MG Road (Bengaluru)",
    lat: 12.9716,
    lon: 77.5946,
    address: "MG Road, Bengaluru, Karnataka, 560001, India",
  },
  {
    name: "Marine Drive, Mumbai",
    shortLabel: "🌊 Marine Drive (Mumbai)",
    lat: 18.9438,
    lon: 72.8233,
    address: "Marine Drive, Mumbai, Maharashtra, 400020, India",
  },
];

// Inner Leaflet component that renders inside dynamic client wrapper
function LeafletMapInner({
  latitude,
  longitude,
  address,
  onChange,
  zoom = 18,
}: {
  latitude: number;
  longitude: number;
  address?: string;
  onChange: (value: LocationPickerValue) => void;
  zoom?: number;
}) {
  const { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } = require("react-leaflet");
  const L = require("leaflet");
  require("leaflet/dist/leaflet.css");

  const markerRef = useRef<LeafletMarkerType | null>(null);

  // Custom high-visibility pulsing pin icon
  const customPinIcon = useMemo(() => {
    return new L.DivIcon({
      className: "custom-interactive-pin",
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
            opacity: 0.45;
            animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
          "></span>
          <div style="
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            height: 32px;
            width: 32px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            border: 3px solid white;
            box-shadow: 0 8px 20px rgba(16, 185, 129, 0.6);
            color: white;
            font-size: 16px;
          ">📍</div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -22],
    });
  }, [L]);

  // Recenter map controller
  function MapController({ center, zoomLevel }: { center: [number, number]; zoomLevel: number }) {
    const map = useMap();
    useEffect(() => {
      if (Number.isFinite(center[0]) && Number.isFinite(center[1])) {
        map.flyTo(center, zoomLevel, { duration: 1.2, easeLinearity: 0.25 });
      }
    }, [center, zoomLevel, map]);

    useEffect(() => {
      map.invalidateSize();
      const t = setTimeout(() => map.invalidateSize(), 300);
      return () => clearTimeout(t);
    }, [map]);

    return null;
  }

  // Handle map click events to move pin
  function MapClickHandler() {
    useMapEvents({
      click(e: LeafletMouseEvent) {
        const { lat, lng } = e.latlng;
        onChange({ latitude: parseFloat(lat.toFixed(6)), longitude: parseFloat(lng.toFixed(6)) });
      },
    });
    return null;
  }

  // Handle dragging pin marker
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const { lat, lng } = marker.getLatLng();
          onChange({ latitude: parseFloat(lat.toFixed(6)), longitude: parseFloat(lng.toFixed(6)) });
        }
      },
    }),
    [onChange]
  );

  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={zoom}
      scrollWheelZoom
      style={{ height: "100%", width: "100%", borderRadius: "inherit" }}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      <Marker
        draggable
        eventHandlers={eventHandlers}
        position={[latitude, longitude]}
        icon={customPinIcon}
        ref={markerRef}
      >
        <Popup>
          <div className="text-center p-1">
            <div className="text-xs font-black text-emerald-700">📍 Shop Location Selected</div>
            <div className="text-[11px] text-gray-600 mt-1 max-w-[200px] truncate">
              {address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`}
            </div>
            <div className="text-[10px] text-gray-400 font-semibold mt-1">
              ✨ Drag pin or click map to adjust
            </div>
          </div>
        </Popup>
      </Marker>
      <MapController center={[latitude, longitude]} zoomLevel={zoom} />
      <MapClickHandler />
    </MapContainer>
  );
}

// Client-only dynamic loader to avoid SSR window error
const ClientLeafletMap = dynamic(
  () => Promise.resolve(LeafletMapInner),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400 gap-3">
        <Loader2 size={32} className="animate-spin text-emerald-500" />
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
          Loading Interactive Map Picker...
        </span>
      </div>
    ),
  }
);

export default function InteractiveMapPicker({
  latitude,
  longitude,
  address,
  onChange,
  initialLat,
  initialLng,
  initialAddress,
  shopName,
  onLocationSelect,
  className = "w-full h-80",
  zoom = 18,
}: InteractiveMapPickerProps) {
  // Default to Chennai or given coords
  const currentLat = latitude ?? initialLat ?? 13.06158;
  const currentLng = longitude ?? initialLng ?? 80.26094;
  const currentAddress = address ?? initialAddress ?? "";

  const notifyChange = useCallback(
    (val: LocationPickerValue) => {
      if (onChange) onChange(val);
      if (onLocationSelect) {
        onLocationSelect({ lat: val.latitude, lng: val.longitude, address: val.address });
      }
    },
    [onChange, onLocationSelect]
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // Debounced reverse geocode when coordinates change
  const lastGeocodedCoords = useRef<{ lat: number; lng: number } | null>(null);

  const reverseGeocode = useCallback(
    async (lat: number, lon: number) => {
      if (
        lastGeocodedCoords.current &&
        Math.abs(lastGeocodedCoords.current.lat - lat) < 0.00001 &&
        Math.abs(lastGeocodedCoords.current.lng - lon) < 0.00001
      ) {
        return;
      }
      lastGeocodedCoords.current = { lat, lng: lon };
      setIsReverseGeocoding(true);

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&format=json`,
          {
            headers: {
              "Accept-Language": "en",
              "User-Agent": "ExpiryGo-InteractivePicker/1.0",
            },
          }
        );
        const data = await res.json();
        if (data && data.display_name) {
          notifyChange({
            latitude: parseFloat(lat.toFixed(6)),
            longitude: parseFloat(lon.toFixed(6)),
            address: data.display_name,
            matchedName: data.name || undefined,
          });
        }
      } catch (err) {
        console.warn("Reverse geocode failed:", err);
      } finally {
        setIsReverseGeocoding(false);
      }
    },
    [notifyChange]
  );

  const handleLocationChange = useCallback(
    (newVal: LocationPickerValue) => {
      const preciseVal = {
        ...newVal,
        latitude: parseFloat(newVal.latitude.toFixed(6)),
        longitude: parseFloat(newVal.longitude.toFixed(6)),
      };
      notifyChange(preciseVal);
      reverseGeocode(preciseVal.latitude, preciseVal.longitude);
    },
    [notifyChange, reverseGeocode]
  );

  // Search Address on Nominatim
  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=5`,
        {
          headers: {
            "Accept-Language": "en",
            "User-Agent": "ExpiryGo-InteractivePicker/1.0",
          },
        }
      );
      const data = await res.json();
      setSearchResults(data || []);
      if (!data || data.length === 0) {
        alert("No locations found for this query. Try adding a city name (e.g. 'Spencer Plaza, Chennai').");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to search location. Please check your network connection.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (item: any) => {
    const lat = parseFloat(parseFloat(item.lat).toFixed(6));
    const lon = parseFloat(parseFloat(item.lon).toFixed(6));
    setSearchResults([]);
    setSearchQuery(item.display_name);
    notifyChange({
      latitude: lat,
      longitude: lon,
      address: item.display_name,
      matchedName: item.name || undefined,
    });
  };

  // GPS Current Location Detection
  const handleDetectLocation = () => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(6));
          const lon = parseFloat(pos.coords.longitude.toFixed(6));
          setIsLocating(false);
          handleLocationChange({ latitude: lat, longitude: lon });
        },
        (err) => {
          console.warn("GPS failed, falling back to IP:", err);
          fetchIpGeolocation()
            .then((data) => {
              handleLocationChange({ latitude: parseFloat(data.latitude.toFixed(6)), longitude: parseFloat(data.longitude.toFixed(6)) });
            })
            .catch(() => alert("Could not detect location: " + err.message))
            .finally(() => setIsLocating(false));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      fetchIpGeolocation()
        .then((data) => {
          handleLocationChange({ latitude: parseFloat(data.latitude.toFixed(6)), longitude: parseFloat(data.longitude.toFixed(6)) });
        })
        .catch(() => alert("Geolocation not supported."))
        .finally(() => setIsLocating(false));
    }
  };

  const handleApplyPreset = (preset: (typeof PRESET_LANDMARKS)[0]) => {
    setSearchResults([]);
    setSearchQuery(preset.name);
    notifyChange({
      latitude: preset.lat,
      longitude: preset.lon,
      address: preset.address,
      matchedName: preset.name,
    });
  };

  return (
    <div className="space-y-3">
      {/* Preset Landmark Chips */}
      <div>
        <div className="flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-1.5">
          <Sparkles size={12} className="text-emerald-500" />
          Quick Food Landmark Presets
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_LANDMARKS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className="text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer shadow-xs"
            >
              {preset.shortLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Map Search Bar & GPS Locate Button */}
      <div className="flex gap-2 relative">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit(e)}
            placeholder="Search address, landmark, or area (e.g. Connaught Place, New Delhi)..."
            className="w-full pl-10 pr-20 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
          />
          <button
            type="button"
            onClick={() => handleSearchSubmit()}
            disabled={isSearching || !searchQuery.trim()}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl transition disabled:opacity-50 cursor-pointer flex items-center gap-1"
          >
            {isSearching ? <Loader2 size={12} className="animate-spin" /> : "Search"}
          </button>
        </div>

        <button
          type="button"
          onClick={handleDetectLocation}
          disabled={isLocating}
          title="Detect Current GPS Location"
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white dark:bg-gray-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-gray-200 dark:border-gray-700 text-emerald-600 dark:text-emerald-400 text-xs font-black transition cursor-pointer shadow-xs whitespace-nowrap disabled:opacity-50"
        >
          {isLocating ? <Loader2 size={16} className="animate-spin" /> : <Crosshair size={16} />}
          <span>GPS Locate</span>
        </button>

        {/* Autocomplete Search Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute top-12 left-0 right-0 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800 max-h-60 overflow-y-auto">
            {searchResults.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSearchResult(item)}
                className="w-full text-left px-4 py-2.5 text-xs text-slate-800 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 flex items-start gap-2 cursor-pointer transition-colors"
              >
                <MapPin size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                <span className="truncate">{item.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map Display Container */}
      <div
        className={`${className} relative rounded-3xl overflow-hidden border-2 border-emerald-500/20 dark:border-gray-700 shadow-md`}
      >
        <ClientLeafletMap
          latitude={currentLat}
          longitude={currentLng}
          address={address}
          onChange={handleLocationChange}
          zoom={zoom}
        />

        {/* Real-Time Coordinates & Reverse Geocoding Overlay Pill */}
        <div className="absolute bottom-3 left-3 right-3 z-10 pointer-events-none flex items-center justify-between">
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-gray-200/80 dark:border-gray-700 shadow-md flex items-center gap-2 text-[11px] font-mono font-bold text-slate-700 dark:text-gray-200">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>
              {currentLat.toFixed(6)}, {currentLng.toFixed(6)}
            </span>
            {isReverseGeocoding && (
              <span className="text-[10px] text-emerald-600 flex items-center gap-1 font-sans">
                <Loader2 size={10} className="animate-spin" /> Resolving address...
              </span>
            )}
          </div>
          <div className="bg-emerald-600/90 text-white text-[10px] font-black px-2.5 py-1 rounded-xl backdrop-blur-md shadow-sm">
            Interactive Pin
          </div>
        </div>
      </div>
    </div>
  );
}
