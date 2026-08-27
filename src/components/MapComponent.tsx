"use client";

import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function createCustomIcon() {
  return new L.DivIcon({
    className: "custom-map-marker",
    html: `
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        top: -16px;
        left: -16px;
      ">
        <span style="
          position: absolute;
          display: inline-flex;
          height: 100%;
          width: 100%;
          border-radius: 50%;
          background-color: #FF5B26;
          opacity: 0.4;
          animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></span>
        <span style="
          position: relative;
          display: inline-flex;
          border-radius: 50%;
          height: 16px;
          width: 16px;
          background-color: #FF5B26;
          border: 2.5px solid white;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);
        "></span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

function RecenterMap({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], zoom, { animate: true, duration: 1.2 });
  }, [lat, lng, zoom, map]);

  useEffect(() => {
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 500);
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
};

export type MapProps = {
  lat: number;
  lng: number;
  zoom?: number;
  popupText?: string;
  className?: string;
  markers?: MapMarker[];
  selectedMarker?: MapMarker | null;
  onMarkerClick?: (marker: MapMarker) => void;
};

export default function MapComponent({
  lat,
  lng,
  zoom = 14,
  popupText,
  className = "w-full h-full",
  markers,
  selectedMarker,
  onMarkerClick,
}: MapProps) {
  const points =
    markers && markers.length > 0
      ? markers
      : [{ id: "center", lat, lng, label: popupText ?? "Location" }];

  const customIcon = useMemo(() => createCustomIcon(), []);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);

  useEffect(() => {
    if (!selectedMarker || (selectedMarker.lat === lat && selectedMarker.lng === lng)) {
      setRouteCoords([]);
      return;
    }

    // Call real-world OSRM road routing engine
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${lng},${lat};${selectedMarker.lng},${selectedMarker.lat}?overview=full&geometries=geojson`;
    fetch(osrmUrl)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.routes && data.routes.length > 0) {
          const coords = data.routes[0].geometry.coordinates.map(
            (c: [number, number]) => [c[1], c[0]] as [number, number]
          );
          setRouteCoords(coords);
        } else {
          setRouteCoords([[lat, lng], [selectedMarker.lat, selectedMarker.lng]]);
        }
      })
      .catch(() => {
        setRouteCoords([[lat, lng], [selectedMarker.lat, selectedMarker.lng]]);
      });
  }, [selectedMarker, lat, lng]);

  return (
    <div className={className} style={{ position: "relative", zIndex: 0, minHeight: "100%", width: "100%" }}>
      <MapContainer
        center={[lat, lng]}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: "100%", width: "100%", borderRadius: "inherit" }}
        attributionControl={false}
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {routeCoords.length > 0 && (
          <Polyline
            positions={routeCoords}
            pathOptions={{ color: "#FF5B26", weight: 5, opacity: 0.85, lineJoin: "round" }}
          />
        )}

        {points.map((m) => (
          <Marker
            key={m.id}
            position={[m.lat, m.lng]}
            icon={customIcon}
            eventHandlers={
              onMarkerClick
                ? {
                    click: () => onMarkerClick(m),
                  }
                : undefined
            }
          >
            <Popup>
              <span className="font-semibold text-gray-900">{m.label}</span>
            </Popup>
          </Marker>
        ))}
        <RecenterMap lat={lat} lng={lng} zoom={zoom} />
      </MapContainer>
    </div>
  );
}
