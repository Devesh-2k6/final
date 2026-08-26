import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import {
  MapPin,
  Navigation,
  Store,
  ChevronRight,
  Sparkles,
  Compass,
  Locate,
} from "lucide-react-native";
import { Colors, Radius, Shadows, Spacing, Typography } from "../../theme";
import { listShops, ShopWithDescription } from "../../services/shops";

interface MapScreenProps {
  navigation: any;
}

export const MapScreen: React.FC<MapScreenProps> = ({ navigation }) => {
  const [shops, setShops] = useState<ShopWithDescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRadius, setSelectedRadius] = useState<number>(5);
  const [selectedShop, setSelectedShop] = useState<ShopWithDescription | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({
    lat: 13.0827,
    lng: 80.2707,
  });
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    async function initLocationAndShops() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({});
          setUserLocation({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
          });
        }
      } catch (err) {
        console.log("Location permission skipped:", err);
      }

      try {
        const data = await listShops();
        setShops(data);
        if (data.length > 0) {
          setSelectedShop(data[0]);
        }
      } catch (err) {
        console.log("Failed to fetch shops:", err);
      } finally {
        setLoading(false);
      }
    }

    initLocationAndShops();
  }, []);

  const calculateDistance = (shopLat: number, shopLng: number) => {
    const R = 6371; // km
    const dLat = ((shopLat - userLocation.lat) * Math.PI) / 180;
    const dLon = ((shopLng - userLocation.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((userLocation.lat * Math.PI) / 180) *
        Math.cos((shopLat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return `${d.toFixed(1)} km`;
  };

  const handleOpenGoogleMaps = (shop: ShopWithDescription) => {
    const lat = shop.latitude || 13.0827;
    const lng = shop.longitude || 80.2707;
    const label = encodeURIComponent(shop.name);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${label}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Google Maps", `Store Address: ${shop.address}`);
    });
  };

  // Generate interactive Leaflet Real Map HTML with pins and live route polyline
  const generateMapHtml = () => {
    const shopsJson = JSON.stringify(
      shops.map((s) => ({
        id: s.id,
        name: s.name,
        address: s.address,
        lat: s.latitude,
        lng: s.longitude,
        dealCount: s.deal_count ?? 3,
      }))
    );

    const activeShopJson = selectedShop
      ? JSON.stringify({
          id: selectedShop.id,
          lat: selectedShop.latitude,
          lng: selectedShop.longitude,
          name: selectedShop.name,
        })
      : "null";

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style>
            html, body, #map {
              height: 100%;
              width: 100%;
              margin: 0;
              padding: 0;
              background-color: #f8f9fa;
            }
            .user-pulse {
              position: relative;
              width: 24px;
              height: 24px;
            }
            .user-pulse-ring {
              position: absolute;
              width: 24px;
              height: 24px;
              border-radius: 50%;
              background: rgba(59, 130, 246, 0.4);
              animation: pulse 1.6s infinite ease-out;
            }
            .user-pulse-dot {
              position: absolute;
              top: 5px;
              left: 5px;
              width: 14px;
              height: 14px;
              border-radius: 50%;
              background: #2563eb;
              border: 2.5px solid white;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            }
            @keyframes pulse {
              0% { transform: scale(0.6); opacity: 1; }
              100% { transform: scale(2.2); opacity: 0; }
            }
            .store-marker {
              background: #FF5B26;
              color: white;
              border-radius: 18px;
              padding: 4px 8px;
              font-family: -apple-system, sans-serif;
              font-size: 11px;
              font-weight: 800;
              box-shadow: 0 4px 12px rgba(255, 91, 38, 0.45);
              border: 2px solid white;
              display: flex;
              align-items: center;
              gap: 4px;
              white-space: nowrap;
            }
            .store-marker.active {
              background: #111827;
              transform: scale(1.1);
              box-shadow: 0 6px 16px rgba(0,0,0,0.5);
            }
            .leaflet-popup-content-wrapper {
              border-radius: 16px;
              padding: 6px;
              box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            }
            .leaflet-popup-content {
              margin: 8px 12px;
              font-family: -apple-system, sans-serif;
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            const userLat = ${userLocation.lat};
            const userLng = ${userLocation.lng};
            const shops = ${shopsJson};
            const activeShop = ${activeShopJson};

            const map = L.map('map', {
              zoomControl: false,
              attributionControl: false
            }).setView([userLat, userLng], 14);

            // High-detail modern street tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 19
            }).addTo(map);

            // User Location Marker
            const userIcon = L.divIcon({
              className: 'user-icon-container',
              html: '<div class="user-pulse"><div class="user-pulse-ring"></div><div class="user-pulse-dot"></div></div>',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            });
            L.marker([userLat, userLng], { icon: userIcon }).addTo(map).bindPopup('<b>📍 Your Location</b>');

            let routeLine = null;

            function drawRoute(toLat, toLng) {
              if (routeLine) {
                map.removeLayer(routeLine);
              }
              routeLine = L.polyline([[userLat, userLng], [toLat, toLng]], {
                color: '#FF5B26',
                weight: 4,
                opacity: 0.85,
                dashArray: '8, 8'
              }).addTo(map);
            }

            // Add Store Markers
            shops.forEach(shop => {
              const isActive = activeShop && activeShop.id === shop.id;
              const storeIcon = L.divIcon({
                className: 'custom-store-pin',
                html: '<div class="store-marker ' + (isActive ? 'active' : '') + '">🏪 ' + shop.name + ' <span style="background:rgba(255,255,255,0.3);padding:1px 4px;border-radius:6px;font-size:9px">' + shop.dealCount + ' deals</span></div>',
                iconAnchor: [50, 20]
              });

              const marker = L.marker([shop.lat, shop.lng], { icon: storeIcon }).addTo(map);
              
              marker.on('click', () => {
                drawRoute(shop.lat, shop.lng);
                map.panTo([shop.lat, shop.lng]);
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SHOP_CLICK', shopId: shop.id }));
              });
            });

            if (activeShop) {
              drawRoute(activeShop.lat, activeShop.lng);
              const bounds = L.latLngBounds([[userLat, userLng], [activeShop.lat, activeShop.lng]]);
              map.fitBounds(bounds, { padding: [40, 40] });
            }
          </script>
        </body>
      </html>
    `;
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "SHOP_CLICK" && data.shopId) {
        const found = shops.find((s) => s.id === data.shopId);
        if (found) {
          setSelectedShop(found);
        }
      }
    } catch (e) {
      // Ignore
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Nearby Surplus Stores</Text>
          <Text style={styles.headerSub}>Real street map with turn-by-turn route navigation</Text>
        </View>
        <View style={styles.radarPill}>
          <Compass size={13} color={Colors.primary} />
          <Text style={styles.radarText}>LIVE MAP</Text>
        </View>
      </View>

      {/* Radius Filters */}
      <View style={styles.radiusRow}>
        {[1, 3, 5, 10].map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.radiusChip, selectedRadius === r && styles.radiusChipActive]}
            onPress={() => setSelectedRadius(r)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.radiusChipText,
                selectedRadius === r && styles.radiusChipTextActive,
              ]}
            >
              Within {r} km
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Real Interactive Street Map Container */}
      <View style={styles.mapCanvas}>
        {loading ? (
          <View style={styles.loaderArea}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={styles.loaderText}>Loading live GPS map & stores...</Text>
          </View>
        ) : (
          <WebView
            ref={webViewRef}
            originWhitelist={["*"]}
            source={{ html: generateMapHtml() }}
            style={styles.webView}
            onMessage={handleWebViewMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            scalesPageToFit={true}
          />
        )}
      </View>

      {/* Store Details Bottom Sheet */}
      {selectedShop && !loading && (
        <View style={styles.selectedCard}>
          <View style={styles.selectedCardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.selectedShopName}>{selectedShop.name}</Text>
              <Text style={styles.selectedShopAddress} numberOfLines={1}>
                {selectedShop.address}
              </Text>
            </View>
            <View style={styles.distancePill}>
              <Navigation size={12} color={Colors.primary} />
              <Text style={styles.distanceText}>
                {calculateDistance(selectedShop.latitude, selectedShop.longitude)}
              </Text>
            </View>
          </View>

          <View style={styles.selectedCardActions}>
            {/* Google Maps Route Button */}
            <TouchableOpacity
              style={styles.googleMapsBtn}
              onPress={() => handleOpenGoogleMaps(selectedShop)}
              activeOpacity={0.85}
            >
              <Navigation size={14} color="#FFF" />
              <Text style={styles.googleMapsBtnText}>Start Route in Google Maps</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.viewDealsBtn}
              onPress={() => navigation.navigate("DealsTab")}
              activeOpacity={0.85}
            >
              <Text style={styles.viewDealsText}>Browse Deals</Text>
              <ChevronRight size={15} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === "ios" ? 54 : 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
  },
  headerTitle: {
    ...Typography.title1,
    fontSize: 20,
  },
  headerSub: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  radarPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    gap: 4,
  },
  radarText: {
    ...Typography.tag,
    color: Colors.primary,
    fontWeight: "900",
  },
  radiusRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    gap: 8,
    marginVertical: Spacing.sm,
  },
  radiusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  radiusChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  radiusChipText: {
    ...Typography.caption,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  radiusChipTextActive: {
    color: "#FFF",
  },
  mapCanvas: {
    flex: 1,
    marginHorizontal: Spacing.md,
    marginBottom: 10,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: "#e5e7eb",
    ...Shadows.card,
  },
  webView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  loaderArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loaderText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  selectedCard: {
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.md,
    marginBottom: Platform.OS === "ios" ? 28 : 16,
    borderRadius: 20,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    ...Shadows.card,
  },
  selectedCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  selectedShopName: {
    ...Typography.title2,
    fontSize: 16,
    fontWeight: "800",
  },
  selectedShopAddress: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  distancePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    gap: 4,
  },
  distanceText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: "800",
    fontSize: 11,
  },
  selectedCardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  googleMapsBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    borderRadius: Radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    ...Shadows.hover,
  },
  googleMapsBtnText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 12,
  },
  viewDealsBtn: {
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    borderRadius: Radius.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewDealsText: {
    color: Colors.primary,
    fontWeight: "800",
    fontSize: 12,
  },
});
