import React, { useMemo } from "react";
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Linking, Platform } from "react-native";
import { WebView } from "react-native-webview";
import { ExternalLink, Compass } from "lucide-react-native";
import { Colors, Radius } from "../theme";

interface MobileAdminLocationMapProps {
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
  height?: number;
}

export const MobileAdminLocationMap: React.FC<MobileAdminLocationMapProps> = ({
  submittedLat,
  submittedLng,
  submittedName,
  submittedAddress = "",
  matchedLat,
  matchedLng,
  matchedName,
  matchedAddress = "",
  distanceMeters,
  category = "Food",
  isVerified = false,
  height = 190,
}) => {
  const isValidSubmitted = !isNaN(submittedLat) && !isNaN(submittedLng) && submittedLat !== 0;

  const htmlContent = useMemo(() => {
    if (!isValidSubmitted) return "";

    const hasMatched =
      matchedLat != null &&
      matchedLng != null &&
      !isNaN(matchedLat) &&
      !isNaN(matchedLng) &&
      matchedLat !== 0 &&
      (matchedLat !== submittedLat || matchedLng !== submittedLng);

    const safeSubName = JSON.stringify(submittedName || "Store Location");
    const safeSubAddr = JSON.stringify(submittedAddress || "");
    const safeMatchName = JSON.stringify(matchedName || submittedName || "OSM Match");
    const safeMatchAddr = JSON.stringify(matchedAddress || "");
    const statusColor = isVerified ? "#10b981" : "#f59e0b";
    const statusFill = isVerified ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)";
    const matchIcon = isVerified ? "🏪" : "⚠️";

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .custom-pin {
      display: flex; align-items: center; justify-content: center;
      width: 32px; height: 32px; border-radius: 50%;
      border: 2px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.25);
      font-size: 14px;
    }
    .sub-pin { background: #2563eb; color: #ffffff; }
    .match-pin { background: ${statusColor}; color: #ffffff; }
    .legend-box {
      position: absolute; bottom: 8px; right: 8px; z-index: 1000;
      background: rgba(255, 255, 255, 0.94); backdrop-filter: blur(8px);
      padding: 5px 8px; border-radius: 8px; font-size: 10px; font-weight: 700;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15); border: 1px solid #e2e8f0;
      display: flex; flex-direction: column; gap: 3px;
    }
    .legend-item { display: flex; align-items: center; gap: 5px; color: #1e293b; }
    .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="legend-box">
    <div class="legend-item"><span class="dot" style="background: #2563eb;"></span> Submitted GPS</div>
    <div class="legend-item"><span class="dot" style="background: ${statusColor};"></span> ${isVerified ? "OSM Food Match" : "Nearby Place"}</div>
    <div class="legend-item"><span class="dot" style="border: 1px dashed ${statusColor}; background: ${statusFill};"></span> 100m Radius</div>
  </div>

  <script>
    try {
      var subLat = ${submittedLat};
      var subLng = ${submittedLng};
      var map = L.map('map', {
        center: [subLat, subLng],
        zoom: 17,
        zoomControl: false,
        attributionControl: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      L.control.zoom({ position: 'topleft' }).addTo(map);

      // 100m verification buffer circle
      L.circle([subLat, subLng], {
        radius: 100,
        color: '${statusColor}',
        weight: 1.8,
        dashArray: '5, 5',
        fillColor: '${statusColor}',
        fillOpacity: 0.12
      }).addTo(map);

      // Submitted store pin
      var subIcon = L.divIcon({
        className: '',
        html: '<div class="custom-pin sub-pin">📍</div>',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
      });

      var subMarker = L.marker([subLat, subLng], { icon: subIcon }).addTo(map);
      subMarker.bindPopup('<b>' + ${safeSubName} + '</b><br><span style="font-size:11px;color:#64748b;">' + ${safeSubAddr} + '</span>').openPopup();

      var points = [[subLat, subLng]];

      // Optional matched place pin
      ${
        hasMatched
          ? `
        var matchLat = ${matchedLat};
        var matchLng = ${matchedLng};
        points.push([matchLat, matchLng]);

        var matchIcon = L.divIcon({
          className: '',
          html: '<div class="custom-pin match-pin">${matchIcon}</div>',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16]
        });

        var matchMarker = L.marker([matchLat, matchLng], { icon: matchIcon }).addTo(map);
        matchMarker.bindPopup('<b>' + ${safeMatchName} + '</b><br><span style="font-size:11px;color:#64748b;">' + ${safeMatchAddr} + '</span>');

        L.polyline([[subLat, subLng], [matchLat, matchLng]], {
          color: '${statusColor}',
          weight: 2,
          dashArray: '4, 4'
        }).addTo(map);
      `
          : ""
      }

      if (points.length > 1) {
        map.fitBounds(L.latLngBounds(points), { padding: [30, 30], maxZoom: 18 });
      }
    } catch (e) {
      console.error(e);
    }
  </script>
</body>
</html>
    `;
  }, [
    isValidSubmitted,
    submittedLat,
    submittedLng,
    submittedName,
    submittedAddress,
    matchedLat,
    matchedLng,
    matchedName,
    matchedAddress,
    isVerified,
  ]);

  const handleOpenExternal = () => {
    const url = `https://www.google.com/maps?q=${submittedLat},${submittedLng}`;
    Linking.openURL(url).catch(() => {});
  };

  if (!isValidSubmitted) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Compass size={24} color={Colors.textMuted} />
        <Text style={styles.emptyText}>GPS Coordinates not available</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <Compass size={13} color={isVerified ? Colors.success : Colors.amber} />
          <Text style={styles.headerTitle}>INTERACTIVE MAP & DISTANCE VERIFICATION</Text>
        </View>
        <TouchableOpacity style={styles.externalBtn} onPress={handleOpenExternal} activeOpacity={0.7}>
          <Text style={styles.externalBtnText}>External Map</Text>
          <ExternalLink size={10} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Map WebView Container */}
      <View style={[styles.mapContainer, { height }]}>
        <WebView
          originWhitelist={["*"]}
          source={{ html: htmlContent }}
          style={styles.webView}
          scrollEnabled={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingText}>Loading Map...</Text>
            </View>
          )}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 8,
    borderRadius: Radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.card,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  externalBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: Radius.xs,
    backgroundColor: "rgba(255, 91, 38, 0.08)",
  },
  externalBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.primary,
  },
  mapContainer: {
    width: "100%",
    backgroundColor: "#f8fafc",
    position: "relative",
  },
  webView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    gap: 6,
  },
  loadingText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  emptyContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 6,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textMuted,
  },
});
