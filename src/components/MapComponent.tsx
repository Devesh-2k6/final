"use client";

import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function createShopIcon(isSelected: boolean = false) {
  const color = isSelected ? "#10b981" : "#FF5B26";
  const glow = isSelected ? "rgba(16, 185, 129, 0.45)" : "rgba(255, 91, 38, 0.45)";
  return new L.DivIcon({
    className: "custom-shop-marker",
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
          background-color: ${color};
          opacity: 0.4;
          animation: ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></span>
        <span style="
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          height: 22px;
          width: 22px;
          background-color: ${color};
          border: 2.5px solid white;
          box-shadow: 0 8px 16px ${glow};
          color: white;
          font-size: 11px;
        ">🏪</span>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

function createUserIcon() {
  return new L.DivIcon({
    className: "custom-user-marker",
    html: `
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        top: -14px;
        left: -14px;
      ">
        <span style="
          position: absolute;
          display: inline-flex;
          height: 100%;
          width: 100%;
          border-radius: 50%;
          background-color: #3b82f6;
          opacity: 0.4;
          animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></span>
        <span style="
          position: relative;
          display: inline-flex;
          border-radius: 50%;
          height: 16px;
          width: 16px;
          background-color: #2563eb;
          border: 2.5px solid white;
          box-shadow: 0 4px 10px rgba(37, 99, 235, 0.5);
        "></span>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

function RecenterMap({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      map.flyTo([lat, lng], zoom, { animate: true, duration: 1.0 });
    }
  }, [lat, lng, zoom, map]);

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

  return null;
}

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  dealCount?: number;
};

export type MapProps = {
  lat: number;
  lng: number;
  zoom?: number;
  popupText?: string;
  className?: string;
  originLocation?: { lat: number; lng: number } | null;
  markers?: MapMarker[];
  selectedMarker?: MapMarker | null;
  onMarkerClick?: (marker: MapMarker) => void;
  layerType?: "streets" | "satellite";
};

export default function MapComponent({
  lat,
  lng,
  zoom = 14,
  popupText,
  className = "w-full h-full",
  originLocation,
  markers,
  selectedMarker,
  onMarkerClick,
  layerType = "streets",
}: MapProps) {
  const points =
    markers && markers.length > 0
      ? markers
      : [{ id: "center", lat, lng, label: popupText ?? "Location" }];

  const shopIcon = useMemo(() => createShopIcon(false), []);
  const selectedShopIcon = useMemo(() => createShopIcon(true), []);
  const userIcon = useMemo(() => createUserIcon(), []);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);

  useEffect(() => {
    if (!selectedMarker) {
      setRouteCoords([]);
      return;
    }

    const startLat = originLocation ? originLocation.lat : lat;
    const startLng = originLocation ? originLocation.lng : lng;

    if (
      Math.abs(startLat - selectedMarker.lat) < 0.00001 &&
      Math.abs(startLng - selectedMarker.lng) < 0.00001
    ) {
      setRouteCoords([]);
      return;
    }

    // Call OSRM turn-by-turn road routing engine
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${selectedMarker.lng},${selectedMarker.lat}?overview=full&geometries=geojson`;
    let isCancelled = false;

    fetch(osrmUrl)
      .then((res) => res.json())
      .then((data) => {
        if (isCancelled) return;
        if (data && data.routes && data.routes.length > 0) {
          const coords = data.routes[0].geometry.coordinates.map(
            (c: [number, number]) => [c[1], c[0]] as [number, number]
          );
          setRouteCoords(coords);
        } else {
          setRouteCoords([
            [startLat, startLng],
            [selectedMarker.lat, selectedMarker.lng],
          ]);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setRouteCoords([
            [startLat, startLng],
            [selectedMarker.lat, selectedMarker.lng],
          ]);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedMarker, originLocation, lat, lng]);

  return (
    <div className={className} style={{ position: "relative", zIndex: 0, minHeight: "100%", width: "100%" }}>
      <MapContainer
        center={[lat, lng]}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: "100%", width: "100%", borderRadius: "inherit" }}
        attributionControl={false}
      >
        {layerType === "streets" ? (
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
        ) : (
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          />
        )}

        {/* Turn-by-Turn Road Route Polyline */}
        {routeCoords.length > 0 && (
          <Polyline
            positions={routeCoords}
            pathOptions={{
              color: "#FF5B26",
              weight: 5,
              opacity: 0.9,
              lineJoin: "round",
            }}
          />
        )}

        {/* User GPS Origin Marker */}
        {originLocation && (
          <Marker position={[originLocation.lat, originLocation.lng]} icon={userIcon}>
            <Popup>
              <div className="font-bold text-xs text-blue-600">📍 Your Search Location</div>
            </Popup>
          </Marker>
        )}

        {/* Store Markers */}
        {points.map((m) => {
          const isSelected = selectedMarker?.id === m.id;
          return (
            <Marker
              key={m.id}
              position={[m.lat, m.lng]}
              icon={isSelected ? selectedShopIcon : shopIcon}
              eventHandlers={
                onMarkerClick
                  ? {
                      click: () => onMarkerClick(m),
                    }
                  : undefined
              }
            >
              <Popup>
                <div className="p-0.5">
                  <div className="font-bold text-xs text-slate-900">{m.label}</div>
                  {m.dealCount !== undefined && (
                    <div className="text-[10px] text-emerald-600 font-bold mt-0.5">
                      {m.dealCount} active surplus {m.dealCount === 1 ? "deal" : "deals"}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
        <RecenterMap lat={lat} lng={lng} zoom={zoom} />
      </MapContainer>
    </div>
  );
}
