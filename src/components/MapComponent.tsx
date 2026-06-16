"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const customIcon = new L.DivIcon({
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
        background-color: #E5A84D;
        opacity: 0.5;
        animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
      "></span>
      <span style="
        position: relative;
        display: inline-flex;
        border-radius: 50%;
        height: 16px;
        width: 16px;
        background-color: #D66B1F;
        border: 2px solid white;
        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);
      "></span>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

function RecenterMap({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], zoom, { animate: true, duration: 1.5 });
  }, [lat, lng, zoom, map]);

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
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
  onMarkerClick?: (marker: MapMarker) => void;
};

export default function MapComponent({
  lat,
  lng,
  zoom = 14,
  popupText,
  className = "w-full h-full",
  markers,
  onMarkerClick,
}: MapProps) {
  const points =
    markers && markers.length > 0
      ? markers
      : [{ id: "center", lat, lng, label: popupText ?? "Location" }];

  return (
    <div className={className} style={{ position: "relative", zIndex: 0 }}>
      <MapContainer
        center={[lat, lng]}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: "100%", width: "100%", borderRadius: "inherit" }}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
        />
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
