"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface AdminLocationMapProps {
  submittedLat: number;
  submittedLng: number;
  submittedName: string;
  submittedAddress?: string;
  matchedLat?: number | null;
  matchedLng?: number | null;
  matchedName?: string | null;
  matchedAddress?: string | null;
  distanceMeters?: number | null;
  category?: string | null;
  isVerified?: boolean;
}

function createSubmittedPin() {
  return new L.DivIcon({
    className: "admin-submitted-pin",
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; top: -16px; left: -16px;">
        <span style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background-color: #3b82f6; opacity: 0.35; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
        <div style="position: relative; width: 26px; height: 26px; border-radius: 50%; background-color: #2563eb; border: 2.5px solid white; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.5); display: flex; align-items: center; justify-content: center; color: white; font-size: 12px;">
          📍
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

function createMatchedPin(isVerified: boolean) {
  const bg = isVerified ? "#10b981" : "#f59e0b";
  const glow = isVerified ? "rgba(16, 185, 129, 0.5)" : "rgba(245, 158, 11, 0.5)";
  const icon = isVerified ? "🏪" : "⚠️";

  return new L.DivIcon({
    className: "admin-matched-pin",
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; top: -17px; left: -17px;">
        <span style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background-color: ${bg}; opacity: 0.35; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
        <div style="position: relative; width: 28px; height: 28px; border-radius: 50%; background-color: ${bg}; border: 2.5px solid white; box-shadow: 0 6px 16px ${glow}; display: flex; align-items: center; justify-content: center; color: white; font-size: 13px;">
          ${icon}
        </div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
  });
}

function FitMapBounds({
  points,
}: {
  points: [number, number][];
}) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 1) {
      map.setView(points[0], 17);
    } else if (points.length > 1) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 18 });
    }
  }, [map, points]);

  return null;
}

export default function AdminLocationMap({
  submittedLat,
  submittedLng,
  submittedName,
  submittedAddress,
  matchedLat,
  matchedLng,
  matchedName,
  matchedAddress,
  distanceMeters,
  category,
  isVerified = false,
}: AdminLocationMapProps) {
  const submittedIcon = useMemo(() => createSubmittedPin(), []);
  const matchedIcon = useMemo(() => createMatchedPin(isVerified), [isVerified]);

  // Valid coordinates check
  const hasValidSubmitted = !isNaN(submittedLat) && !isNaN(submittedLng) && submittedLat !== 0;
  const hasValidMatched =
    matchedLat != null &&
    matchedLng != null &&
    !isNaN(matchedLat) &&
    !isNaN(matchedLng) &&
    matchedLat !== 0;

  if (!hasValidSubmitted) {
    return (
      <div className="h-44 rounded-2xl bg-slate-100 dark:bg-gray-800 flex items-center justify-center text-xs text-slate-400 font-semibold border border-slate-200 dark:border-gray-700">
        GPS Coordinates not provided
      </div>
    );
  }

  const points: [number, number][] = [[submittedLat, submittedLng]];
  if (hasValidMatched && (matchedLat !== submittedLat || matchedLng !== submittedLng)) {
    points.push([matchedLat!, matchedLng!]);
  }

  const polylineCoords: [number, number][] = hasValidMatched
    ? [
        [submittedLat, submittedLng],
        [matchedLat!, matchedLng!],
      ]
    : [];

  return (
    <div className="relative w-full h-52 sm:h-60 rounded-2xl overflow-hidden border border-slate-200 dark:border-gray-700 shadow-inner z-0">
      <MapContainer
        center={[submittedLat, submittedLng]}
        zoom={17}
        scrollWheelZoom={false}
        className="w-full h-full"
        style={{ background: "#f8fafc" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* 100m Allowed Verification Radius Circle */}
        <Circle
          center={[submittedLat, submittedLng]}
          radius={100}
          pathOptions={{
            color: isVerified ? "#10b981" : "#3b82f6",
            fillColor: isVerified ? "#10b981" : "#3b82f6",
            fillOpacity: 0.1,
            weight: 1.5,
            dashArray: "4 4",
          }}
        />

        {/* Pin 1: Vendor Submitted Location */}
        <Marker position={[submittedLat, submittedLng]} icon={submittedIcon}>
          <Popup className="custom-admin-popup">
            <div className="p-1 space-y-1 text-xs">
              <span className="font-bold text-blue-600 uppercase tracking-wider text-[10px]">
                📍 Vendor Submitted Pin
              </span>
              <p className="font-bold text-slate-900">{submittedName}</p>
              {submittedAddress && <p className="text-slate-600 text-[11px]">{submittedAddress}</p>}
              <p className="text-[10px] text-slate-400 font-mono">
                GPS: {submittedLat.toFixed(5)}, {submittedLng.toFixed(5)}
              </p>
            </div>
          </Popup>
        </Marker>

        {/* Pin 2: OpenStreetMap Verified Match */}
        {hasValidMatched && (
          <Marker position={[matchedLat!, matchedLng!]} icon={matchedIcon}>
            <Popup className="custom-admin-popup">
              <div className="p-1 space-y-1 text-xs">
                <span className="font-bold text-emerald-600 uppercase tracking-wider text-[10px]">
                  🏪 OSM Matched Food Entity
                </span>
                <p className="font-bold text-slate-900">{matchedName || submittedName}</p>
                {matchedAddress && <p className="text-slate-600 text-[11px]">{matchedAddress}</p>}
                {distanceMeters != null && (
                  <p className="text-emerald-700 font-bold text-[10px]">
                    Distance: {distanceMeters}m from submitted pin
                  </p>
                )}
                {category && (
                  <span className="inline-block px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[9px] font-bold">
                    {category}
                  </span>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Polyline connecting submitted to matched node */}
        {polylineCoords.length === 2 && (
          <Polyline
            positions={polylineCoords}
            pathOptions={{
              color: "#8b5cf6",
              weight: 2,
              dashArray: "5 5",
              opacity: 0.8,
            }}
          />
        )}

        <FitMapBounds points={points} />
      </MapContainer>

      {/* Map Legend Overlay */}
      <div className="absolute top-2 right-2 z-[400] bg-white/90 dark:bg-gray-900/90 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 shadow-md text-[10px] space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-gray-200">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span> Submitted GPS
        </div>
        <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> OSM Food Match
        </div>
        <div className="flex items-center gap-1.5 font-medium text-slate-500">
          <span className="w-2 h-0.5 bg-blue-400 border-b border-dashed"></span> 100m Radius
        </div>
      </div>
    </div>
  );
}
