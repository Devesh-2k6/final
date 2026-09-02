import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import {
  MapPin,
  Navigation,
  Search,
  Check,
  Locate,
  Compass,
  SlidersHorizontal,
  Eye,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react-native";
import { Colors, Radius, Shadows, Spacing, Typography } from "../theme";

export interface MobileLocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  initialAddress?: string;
  onLocationChange: (loc: { lat: number; lng: number; address: string }) => void;
  label?: string;
  required?: boolean;
}

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

export const MobileLocationPicker: React.FC<MobileLocationPickerProps> = ({
  initialLat = 13.0827,
  initialLng = 80.2707,
  initialAddress = "",
  onLocationChange,
  label = "Storefront Physical Location (Direct Live HD Map)",
  required = true,
}) => {
  const [lat, setLat] = useState<number>(initialLat);
  const [lng, setLng] = useState<number>(initialLng);
  const [address, setAddress] = useState<string>(initialAddress);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isGeolocating, setIsGeolocating] = useState<boolean>(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState<boolean>(false);
  const [mapLayerType, setMapLayerType] = useState<"streets" | "satellite">("streets");
  const [statusMsg, setStatusMsg] = useState<{ type: "info" | "success" | "error"; text: string } | null>(null);

  const webViewRef = useRef<WebView>(null);

  const showStatus = (text: string, type: "info" | "success" | "error" = "info") => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 5000);
  };

  // Reverse Geocode: lat/lng -> street address
  const fetchAddressFromCoords = useCallback(
    async (latitude: number, longitude: number) => {
      setIsReverseGeocoding(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
          {
            headers: {
              "Accept-Language": "en",
              "User-Agent": "ExpiryGo-Mobile-App/1.0",
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          if (data && data.display_name) {
            setAddress(data.display_name);
            onLocationChange({ lat: latitude, lng: longitude, address: data.display_name });
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

  const handlePositionChange = useCallback(
    (newLat: number, newLng: number, skipLookup: boolean = false) => {
      const roundedLat = parseFloat(newLat.toFixed(6));
      const roundedLng = parseFloat(newLng.toFixed(6));
      setLat(roundedLat);
      setLng(roundedLng);
      setSearchResults([]);

      // Send to WebView
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          if (window.setMarkerPosition) {
            window.setMarkerPosition(${roundedLat}, ${roundedLng});
          }
          true;
        `);
      }

      if (!skipLookup) {
        fetchAddressFromCoords(roundedLat, roundedLng);
      } else {
        onLocationChange({ lat: roundedLat, lng: roundedLng, address });
      }
    },
    [address, fetchAddressFromCoords, onLocationChange]
  );

  // Micro-Nudge D-Pad: Shift coordinates by 10 meters
  const handleNudge = (direction: "north" | "south" | "east" | "west") => {
    const delta = 0.00009; // ~10 meters
    let targetLat = lat;
    let targetLng = lng;

    if (direction === "north") targetLat += delta;
    if (direction === "south") targetLat -= delta;
    if (direction === "east") targetLng += delta;
    if (direction === "west") targetLng -= delta;

    handlePositionChange(targetLat, targetLng);
  };

  // Real Live GPS Detection
  const handleDetectLiveLocation = async () => {
    setIsGeolocating(true);
    showStatus("📡 Acquiring live GPS position...", "info");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        showStatus("⚠️ Location permission denied", "error");
        setIsGeolocating(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      handlePositionChange(loc.coords.latitude, loc.coords.longitude);
      showStatus(
        `✓ Live GPS acquired (±${Math.round(loc.coords.accuracy || 10)}m). Drag pin or use arrows to fine-tune!`,
        "success"
      );
    } catch (err: any) {
      showStatus(err.message || "Failed to retrieve device GPS.", "error");
    } finally {
      setIsGeolocating(false);
    }
  };

  // Smart Universal Search
  const handleSearchAddress = async (queryText?: string) => {
    const query = (queryText || searchQuery).trim();
    if (!query) return;

    // Check direct coordinates (e.g. "13.0827, 80.2707")
    const coordMatch = query.match(/^([-+]?\d{1,2}(?:\.\d+)?)[,\s]+([-+]?\d{1,3}(?:\.\d+)?)$/);
    if (coordMatch) {
      const pLat = parseFloat(coordMatch[1]);
      const pLng = parseFloat(coordMatch[2]);
      if (pLat >= -90 && pLat <= 90 && pLng >= -180 && pLng <= 180) {
        handlePositionChange(pLat, pLng);
        showStatus(`✓ Jumped to exact coordinates: ${pLat.toFixed(5)}, ${pLng.toFixed(5)}`, "success");
        return;
      }
    }

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        {
          headers: {
            "Accept-Language": "en",
            "User-Agent": "ExpiryGo-Mobile-App/1.0",
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
          showStatus(`✓ Found & Pinned: ${top.display_name.split(",")[0]}`, "success");

          if (webViewRef.current) {
            webViewRef.current.injectJavaScript(`
              if (window.setMarkerPosition) {
                window.setMarkerPosition(${foundLat}, ${foundLng});
              }
              true;
            `);
          }
        } else {
          showStatus(`Could not find "${query}". Try searching city or pincode.`, "error");
        }
      }
    } catch (err) {
      showStatus("Search request failed. Check network connection.", "error");
    } finally {
      setIsSearching(false);
    }
  };

  // Generate Interactive Leaflet Map HTML
  const generateMapHtml = () => {
    const tileUrl =
      mapLayerType === "satellite"
        ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        : "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
          <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
          <style>
            html, body, #map {
              height: 100%;
              width: 100%;
              margin: 0;
              padding: 0;
              background-color: #070a10;
              overflow: hidden;
            }
            .store-pin-wrapper {
              position: relative;
              width: 44px;
              height: 52px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              transform: translate(-22px, -48px);
              cursor: grab;
            }
            .store-pin-ring {
              position: absolute;
              bottom: 0px;
              width: 30px;
              height: 30px;
              border-radius: 50%;
              background-color: rgba(255, 91, 38, 0.55);
              animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
            }
            .store-pin-body {
              position: relative;
              width: 40px;
              height: 40px;
              border-radius: 50% 50% 50% 0;
              background: linear-gradient(135deg, #FF5B26 0%, #D83400 100%);
              transform: rotate(-45deg);
              border: 3px solid #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 6px 18px rgba(255,91,38,0.75);
            }
            .store-pin-emoji {
              transform: rotate(45deg);
              font-size: 18px;
              line-height: 1;
              user-select: none;
            }
            @keyframes ping {
              75%, 100% {
                transform: scale(2);
                opacity: 0;
              }
            }
            .leaflet-popup-content-wrapper {
              background: #0f172a;
              color: #f8fafc;
              border-radius: 12px;
              border: 1px solid #334155;
            }
            .leaflet-popup-tip {
              background: #0f172a;
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            let currentLat = ${lat};
            let currentLng = ${lng};

            const map = L.map('map', {
              zoomControl: false,
              attributionControl: false,
              tap: true,
              touchZoom: true,
              dragging: true
            }).setView([currentLat, currentLng], 18);

            L.tileLayer('${tileUrl}', {
              maxZoom: 19
            }).addTo(map);

            const storeIcon = L.divIcon({
              className: 'custom-storefront-pin',
              html: '<div class="store-pin-wrapper"><span class="store-pin-ring"></span><div class="store-pin-body"><span class="store-pin-emoji">🏪</span></div></div>',
              iconSize: [44, 52],
              iconAnchor: [22, 48]
            });

            let marker = L.marker([currentLat, currentLng], {
              icon: storeIcon,
              draggable: true
            }).addTo(map);

            let circle = L.circle([currentLat, currentLng], {
              radius: 60,
              color: '#FF5B26',
              fillColor: '#FF5B26',
              fillOpacity: 0.15,
              weight: 2,
              dashArray: '4, 6'
            }).addTo(map);

            function postPos(newLat, newLng) {
              currentLat = newLat;
              currentLng = newLng;
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'PIN_MOVED',
                  lat: newLat,
                  lng: newLng
                }));
              }
            }

            marker.on('dragend', function(e) {
              const pos = e.target.getLatLng();
              circle.setLatLng(pos);
              postPos(pos.lat, pos.lng);
            });

            map.on('click', function(e) {
              marker.setLatLng(e.latlng);
              circle.setLatLng(e.latlng);
              map.panTo(e.latlng);
              postPos(e.latlng.lat, e.latlng.lng);
            });

            window.setMarkerPosition = function(newLat, newLng) {
              currentLat = newLat;
              currentLng = newLng;
              marker.setLatLng([newLat, newLng]);
              circle.setLatLng([newLat, newLng]);
              map.flyTo([newLat, newLng], 18, { animate: true, duration: 0.6 });
            };

            setTimeout(function() { map.invalidateSize(); }, 150);
            setTimeout(function() { map.invalidateSize(); }, 600);
          </script>
        </body>
      </html>
    `;
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "PIN_MOVED" && data.lat && data.lng) {
        const roundedLat = parseFloat(data.lat.toFixed(6));
        const roundedLng = parseFloat(data.lng.toFixed(6));
        setLat(roundedLat);
        setLng(roundedLng);
        fetchAddressFromCoords(roundedLat, roundedLng);
      }
    } catch (e) {
      // Ignore
    }
  };

  return (
    <View style={styles.container}>
      {/* Header & Controls */}
      <View style={styles.headerRow}>
        <Text style={styles.label}>
          {label} {required && <Text style={{ color: "#ef4444" }}>*</Text>}
        </Text>
        <View style={styles.headerActions}>
          {/* Satellite vs Streets Toggle */}
          <TouchableOpacity
            style={[
              styles.actionChip,
              mapLayerType === "satellite" && { backgroundColor: "#2563eb", borderColor: "#3b82f6" },
            ]}
            onPress={() => setMapLayerType(mapLayerType === "streets" ? "satellite" : "streets")}
            activeOpacity={0.8}
          >
            <Eye size={12} color={mapLayerType === "satellite" ? "#FFF" : Colors.textPrimary} />
            <Text style={[styles.actionChipText, mapLayerType === "satellite" && { color: "#FFF" }]}>
              {mapLayerType === "satellite" ? "🛰️ Satellite" : "🛰️ Satellite"}
            </Text>
          </TouchableOpacity>

          {/* Locate Me (Live GPS) */}
          <TouchableOpacity
            style={[styles.actionChip, { backgroundColor: "#ea580c", borderColor: "#f97316" }]}
            onPress={handleDetectLiveLocation}
            disabled={isGeolocating}
            activeOpacity={0.8}
          >
            {isGeolocating ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Locate size={12} color="#FFF" />
            )}
            <Text style={[styles.actionChipText, { color: "#FFF", fontWeight: "800" }]}>
              {isGeolocating ? "Locating..." : "📍 Locate Me"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Universal Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputBox}>
          <Search size={15} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Type street, landmark, area, or pincode..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => handleSearchAddress(searchQuery)}
            returnKeyType="search"
          />
          {searchQuery.trim().length > 0 && (
            <TouchableOpacity
              style={styles.searchBtn}
              onPress={() => handleSearchAddress(searchQuery)}
              disabled={isSearching}
              activeOpacity={0.8}
            >
              {isSearching ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.searchBtnText}>Search & Pin</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Dropdown Suggestions */}
        {searchResults.length > 0 && (
          <View style={styles.suggestionsBox}>
            <View style={styles.suggestionsHeader}>
              <Text style={styles.suggestionsHeaderText}>Matching Locations:</Text>
              <TouchableOpacity onPress={() => setSearchResults([])}>
                <Text style={styles.dismissText}>✕ Dismiss</Text>
              </TouchableOpacity>
            </View>
            {searchResults.map((res, i) => (
              <TouchableOpacity
                key={i}
                style={styles.suggestionItem}
                onPress={() => {
                  const targetLat = parseFloat(res.lat);
                  const targetLng = parseFloat(res.lon);
                  handlePositionChange(targetLat, targetLng);
                  setAddress(res.display_name);
                  setSearchResults([]);
                }}
                activeOpacity={0.8}
              >
                <MapPin size={13} color={Colors.amberBright} style={{ marginTop: 2 }} />
                <Text style={styles.suggestionItemText} numberOfLines={2}>
                  {res.display_name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Quick Indian Cities Teleport Strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.citiesScroll}
      >
        <Text style={styles.citiesLabel}>Major Hubs:</Text>
        {QUICK_CITIES.map((city) => (
          <TouchableOpacity
            key={city.name}
            style={styles.cityChip}
            onPress={() => handlePositionChange(city.lat, city.lng)}
            activeOpacity={0.75}
          >
            <Text style={styles.cityChipText}>📍 {city.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Status Feedback Toast */}
      {statusMsg && (
        <View
          style={[
            styles.statusToast,
            statusMsg.type === "success" && { backgroundColor: "rgba(16, 185, 129, 0.15)", borderColor: "rgba(16, 185, 129, 0.4)" },
            statusMsg.type === "error" && { backgroundColor: "rgba(244, 63, 94, 0.15)", borderColor: "rgba(244, 63, 94, 0.4)" },
          ]}
        >
          <Text
            style={[
              styles.statusToastText,
              statusMsg.type === "success" && { color: Colors.primaryBright },
              statusMsg.type === "error" && { color: Colors.roseBright },
            ]}
          >
            {statusMsg.text}
          </Text>
        </View>
      )}

      {/* Embedded Live Leaflet Map Canvas */}
      <View style={styles.mapCanvasWrapper}>
        <WebView
          key={`loc-picker-${lat.toFixed(4)}-${lng.toFixed(4)}-${mapLayerType}`}
          ref={webViewRef}
          originWhitelist={["*"]}
          source={{ html: generateMapHtml() }}
          style={styles.webView}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          scalesPageToFit={true}
        />

        {/* Live Coordinate Badge Overlay (Top Left) */}
        <View style={styles.coordOverlay}>
          <View style={styles.coordPulseDot} />
          <Text style={styles.coordText}>
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </Text>
        </View>

        {/* Micro-Adjustment D-Pad (Bottom Left Nudge Buttons) */}
        <View style={styles.dpadCard}>
          <Text style={styles.dpadLabel}>10m Nudge</Text>
          <TouchableOpacity
            style={styles.dpadBtn}
            onPress={() => handleNudge("north")}
            activeOpacity={0.75}
          >
            <ChevronUp size={14} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.dpadMiddleRow}>
            <TouchableOpacity
              style={styles.dpadBtn}
              onPress={() => handleNudge("west")}
              activeOpacity={0.75}
            >
              <ChevronLeft size={14} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.dpadCenterDot}>
              <Text style={{ fontSize: 9 }}>🎯</Text>
            </View>
            <TouchableOpacity
              style={styles.dpadBtn}
              onPress={() => handleNudge("east")}
              activeOpacity={0.75}
            >
              <ChevronRight size={14} color="#FFF" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.dpadBtn}
            onPress={() => handleNudge("south")}
            activeOpacity={0.75}
          >
            <ChevronDown size={14} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Drag Helper Tooltip (Bottom Right) */}
        <View style={styles.helperTooltip}>
          <Text style={styles.helperTooltipText}>👆 Drag pin or tap map</Text>
        </View>
      </View>

      {/* Store Physical Address Box */}
      <View style={styles.addressBox}>
        <View style={styles.addressHeaderRow}>
          <Text style={styles.addressLabel}>STORE PHYSICAL ADDRESS</Text>
          {isReverseGeocoding && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <ActivityIndicator size="small" color="#ea580c" />
              <Text style={styles.fetchingText}>Fetching street...</Text>
            </View>
          )}
        </View>
        <TextInput
          style={styles.addressInput}
          multiline
          numberOfLines={2}
          value={address}
          onChangeText={(t) => {
            setAddress(t);
            onLocationChange({ lat, lng, address: t });
          }}
          placeholder="Click anywhere on the map or type address here..."
          placeholderTextColor={Colors.textMuted}
        />
        {address.trim().length > 0 && (
          <TouchableOpacity
            style={styles.pinWrittenBtn}
            onPress={() => handleSearchAddress(address)}
            activeOpacity={0.8}
          >
            <Compass size={12} color="#ea580c" />
            <Text style={styles.pinWrittenBtnText}>Pin Written Address on Map</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
    marginTop: 4,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.textMuted,
    letterSpacing: 0.5,
    flex: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    gap: 4,
  },
  actionChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  searchContainer: {
    position: "relative",
    zIndex: 100,
  },
  searchInputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: Spacing.sm,
    height: 42,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: "600",
  },
  searchBtn: {
    backgroundColor: "#ea580c",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: Radius.xs,
  },
  searchBtnText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 10,
  },
  suggestionsBox: {
    position: "absolute",
    top: 46,
    left: 0,
    right: 0,
    zIndex: 200,
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 6,
    gap: 4,
    ...Shadows.card,
  },
  suggestionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  suggestionsHeaderText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.textMuted,
    textTransform: "uppercase",
  },
  dismissText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: "700",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 6,
    borderRadius: Radius.sm,
    backgroundColor: Colors.background,
    gap: 6,
  },
  suggestionItemText: {
    flex: 1,
    fontSize: 11,
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  citiesScroll: {
    gap: 6,
    paddingVertical: 2,
    alignItems: "center",
  },
  citiesLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.textMuted,
  },
  cityChip: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  cityChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  statusToast: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.sm,
    borderWidth: 1,
    backgroundColor: "rgba(37, 99, 235, 0.15)",
    borderColor: "rgba(37, 99, 235, 0.4)",
  },
  statusToastText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#60a5fa",
    textAlign: "center",
  },
  mapCanvasWrapper: {
    width: "100%",
    height: 280,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(234, 88, 12, 0.4)",
    backgroundColor: "#070a10",
    position: "relative",
    ...Shadows.card,
  },
  webView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  coordOverlay: {
    position: "absolute",
    top: 8,
    left: 8,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(7, 10, 16, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    gap: 6,
  },
  coordPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10b981",
  },
  coordText: {
    fontSize: 10,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontWeight: "800",
    color: "#FFFFFF",
  },
  dpadCard: {
    position: "absolute",
    bottom: 8,
    left: 8,
    zIndex: 10,
    backgroundColor: "rgba(7, 10, 16, 0.92)",
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    gap: 2,
  },
  dpadLabel: {
    fontSize: 8,
    fontWeight: "900",
    color: Colors.textMuted,
    textTransform: "uppercase",
  },
  dpadBtn: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  dpadMiddleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  dpadCenterDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#ea580c",
    alignItems: "center",
    justifyContent: "center",
  },
  helperTooltip: {
    position: "absolute",
    bottom: 8,
    right: 8,
    zIndex: 10,
    backgroundColor: "rgba(7, 10, 16, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  helperTooltipText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  addressBox: {
    gap: 4,
  },
  addressHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  addressLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  fetchingText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#ea580c",
  },
  addressInput: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: "500",
    textAlignVertical: "top",
    minHeight: 50,
  },
  pinWrittenBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 4,
    marginTop: 2,
  },
  pinWrittenBtnText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#ea580c",
  },
});
