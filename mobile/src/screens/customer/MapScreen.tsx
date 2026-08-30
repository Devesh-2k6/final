import React, { useState, useEffect, useRef, useMemo } from "react";
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
  ShoppingBag,
} from "lucide-react-native";
import { Colors, Radius, Shadows, Spacing, Typography } from "../../theme";
import { listShops, ShopWithDescription } from "../../services/shops";

interface MapScreenProps {
  navigation: any;
}

const DEFAULT_SHOPS: ShopWithDescription[] = [
  {
    id: "shop-1",
    name: "Green Valley Supermarket",
    address: "123 Anna Salai, Downtown Chennai",
    latitude: 13.0827,
    longitude: 80.2707,
    deal_count: 5,
    average_rating: 4.8,
    rating_count: 24,
  },
  {
    id: "shop-2",
    name: "Fresh Mart Express",
    address: "456 Usman Road, T. Nagar, Chennai",
    latitude: 13.0406,
    longitude: 80.2443,
    deal_count: 3,
    average_rating: 4.6,
    rating_count: 18,
  },
  {
    id: "shop-3",
    name: "Daily Bazaar",
    address: "789 Nungambakkam High Road, Chennai",
    latitude: 13.0598,
    longitude: 80.2206,
    deal_count: 4,
    average_rating: 4.9,
    rating_count: 32,
  },
];

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const MapScreen: React.FC<MapScreenProps> = ({ navigation }) => {
  const [shops, setShops] = useState<ShopWithDescription[]>(DEFAULT_SHOPS);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [selectedRadius, setSelectedRadius] = useState<number>(10);
  const [selectedShop, setSelectedShop] = useState<ShopWithDescription | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({
    lat: 13.0827,
    lng: 80.2707,
  });
  const webViewRef = useRef<WebView>(null);

  const fetchUserGPS = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        });
      }
    } catch (err) {
      console.log("GPS Location request skipped/failed:", err);
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => {
    async function initLocationAndShops() {
      await fetchUserGPS();
      try {
        const data = await listShops();
        if (data && data.length > 0) {
          setShops(data);
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
    const d = getDistanceKm(userLocation.lat, userLocation.lng, shopLat, shopLng);
    return `${d.toFixed(1)} km`;
  };

  // Filter shops by distance radius
  const radiusFilteredShops = useMemo(() => {
    if (selectedRadius >= 20) return shops;
    const within = shops.filter((s) => {
      const d = getDistanceKm(userLocation.lat, userLocation.lng, s.latitude, s.longitude);
      return d <= selectedRadius;
    });
    return within.length > 0 ? within : shops;
  }, [shops, selectedRadius, userLocation]);

  const handleOpenGoogleMaps = (shop: ShopWithDescription) => {
    const lat = shop.latitude || 13.0827;
    const lng = shop.longitude || 80.2707;
    const label = encodeURIComponent(shop.name);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${label}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Store Location", `${shop.name}\n${shop.address}`);
    });
  };

  // Generate interactive Leaflet Real Map HTML with pins and live route polyline
  const generateMapHtml = () => {
    const activeShops = radiusFilteredShops.length > 0 ? radiusFilteredShops : DEFAULT_SHOPS;

    const shopsJson = JSON.stringify(
      activeShops.map((s) => ({
        id: s.id,
        name: s.name,
        address: s.address,
        lat: s.latitude,
        lng: s.longitude,
        dealCount: s.deal_count ?? 3,
      }))
    );

    const activeTarget = selectedShop || (activeShops[0] as any);
    const activeShopJson = activeTarget
      ? JSON.stringify({
          id: activeTarget.id,
          lat: activeTarget.latitude,
          lng: activeTarget.longitude,
          name: activeTarget.name,
        })
      : "null";

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
              background-color: #f8f9fa;
            }
            .user-pulse {
              position: relative;
              width: 26px;
              height: 26px;
            }
            .user-pulse-ring {
              position: absolute;
              width: 26px;
              height: 26px;
              border-radius: 50%;
              background: rgba(37, 99, 235, 0.4);
              animation: pulse 1.6s infinite ease-out;
            }
            .user-pulse-dot {
              position: absolute;
              top: 5px;
              left: 5px;
              width: 16px;
              height: 16px;
              border-radius: 50%;
              background: #2563eb;
              border: 2.5px solid white;
              box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            }
            @keyframes pulse {
              0% { transform: scale(0.6); opacity: 1; }
              100% { transform: scale(2.2); opacity: 0; }
            }
            .store-marker {
              background: #FF5B26;
              color: white;
              border-radius: 18px;
              padding: 5px 9px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 11px;
              font-weight: 800;
              box-shadow: 0 4px 12px rgba(255, 91, 38, 0.45);
              border: 2px solid white;
              display: flex;
              align-items: center;
              gap: 4px;
              white-space: nowrap;
              cursor: pointer;
            }
            .store-marker.active {
              background: #10b981;
              box-shadow: 0 6px 16px rgba(16, 185, 129, 0.55);
              transform: scale(1.08);
            }
            .leaflet-popup-content-wrapper {
              border-radius: 16px;
              padding: 4px;
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
            }).setView([userLat, userLng], 13);

            // High-detail street tiles
            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 19
            }).addTo(map);

            setTimeout(function() { map.invalidateSize(); }, 150);
            setTimeout(function() { map.invalidateSize(); }, 600);

            // User Location Marker
            const userIcon = L.divIcon({
              className: 'user-icon-container',
              html: '<div class="user-pulse"><div class="user-pulse-ring"></div><div class="user-pulse-dot"></div></div>',
              iconSize: [26, 26],
              iconAnchor: [13, 13]
            });
            L.marker([userLat, userLng], { icon: userIcon }).addTo(map).bindPopup('<b>📍 Your Search Location</b>');

            let routeLine = null;

            function drawRoute(toLat, toLng) {
              if (routeLine) {
                map.removeLayer(routeLine);
              }
              // Call real-world OSRM Road Routing engine for turn-by-turn road polyline
              const osrmUrl = 'https://router.project-osrm.org/route/v1/driving/' + userLng + ',' + userLat + ';' + toLng + ',' + toLat + '?overview=full&geometries=geojson';
              fetch(osrmUrl)
                .then(res => res.json())
                .then(data => {
                  if (data && data.routes && data.routes.length > 0) {
                    const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
                    routeLine = L.polyline(coords, {
                      color: '#FF5B26',
                      weight: 5,
                      opacity: 0.9,
                      lineJoin: 'round'
                    }).addTo(map);
                    map.fitBounds(routeLine.getBounds(), { padding: [45, 45] });
                  } else {
                    routeLine = L.polyline([[userLat, userLng], [toLat, toLng]], {
                      color: '#FF5B26',
                      weight: 4,
                      opacity: 0.85,
                      dashArray: '6, 6'
                    }).addTo(map);
                  }
                })
                .catch(() => {
                  routeLine = L.polyline([[userLat, userLng], [toLat, toLng]], {
                    color: '#FF5B26',
                    weight: 4,
                    opacity: 0.85,
                    dashArray: '6, 6'
                  }).addTo(map);
                });
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
                try {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SHOP_CLICK', shopId: shop.id }));
                } catch(e) {}
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
          <Text style={styles.headerSub}>Live map with turn-by-turn road route navigation</Text>
        </View>
        <TouchableOpacity
          style={styles.radarPill}
          onPress={fetchUserGPS}
          disabled={locating}
          activeOpacity={0.8}
        >
          {locating ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Locate size={13} color={Colors.primary} />
          )}
          <Text style={styles.radarText}>GPS</Text>
        </TouchableOpacity>
      </View>

      {/* Radius Filters */}
      <View style={styles.radiusRow}>
        {[1, 3, 5, 10, 25].map((r) => (
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
              {r >= 25 ? "All Stores" : `${r} km`}
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
            key={`map-${selectedRadius}-${selectedShop?.id}-${radiusFilteredShops.length}-${userLocation.lat}`}
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
              <Text style={styles.googleMapsBtnText}>Get Directions</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.viewDealsBtn}
              onPress={() => navigation.navigate("DealsTab")}
              activeOpacity={0.85}
            >
              <ShoppingBag size={14} color={Colors.primary} />
              <Text style={styles.viewDealsText}>Browse Deals</Text>
              <ChevronRight size={14} color={Colors.primary} />
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
    paddingHorizontal: 10,
    paddingVertical: 5,
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
    justifyContent: "center",
    gap: 6,
  },
  viewDealsText: {
    color: Colors.primary,
    fontWeight: "800",
    fontSize: 12,
  },
});
