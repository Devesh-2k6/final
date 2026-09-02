import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  Platform,
  ScrollView,
  Image,
} from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import {
  MapPin,
  Navigation,
  Store,
  ChevronRight,
  Sparkles,
  Search,
  Locate,
  ShoppingBag,
  Eye,
  ArrowRight,
} from "lucide-react-native";
import { Colors, Radius, Shadows, Spacing, Typography } from "../../theme";
import { listShops, ShopWithDescription } from "../../services/shops";
import { getProducts } from "../../services/products";
import type { ApiProduct } from "../../types";

interface MapScreenProps {
  navigation: any;
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
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [selectedRadius, setSelectedRadius] = useState<number>(10);
  const [selectedShop, setSelectedShop] = useState<ShopWithDescription | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [mapLayerType, setMapLayerType] = useState<"streets" | "satellite">("streets");
  const [statusToast, setStatusToast] = useState<{ text: string; type: "info" | "success" | "error" } | null>(null);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({
    lat: 13.0827,
    lng: 80.2707,
  });
  const webViewRef = useRef<WebView>(null);

  const showToast = (text: string, type: "info" | "success" | "error" = "info") => {
    setStatusToast({ text, type });
    setTimeout(() => setStatusToast(null), 4000);
  };

  const fetchUserGPS = async () => {
    setLocating(true);
    showToast("📡 Acquiring live GPS position...", "info");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const newCoords = {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        };
        setUserLocation(newCoords);
        showToast(`✓ Live GPS centered (±${Math.round(loc.coords.accuracy || 10)}m)`, "success");
      } else {
        showToast("⚠️ Location permission denied", "error");
      }
    } catch (err) {
      showToast("⚠️ GPS lookup error", "error");
    } finally {
      setLocating(false);
    }
  };

  const loadData = useCallback(async () => {
    try {
      const [shopList, productList] = await Promise.all([
        listShops().catch(() => []),
        getProducts({ hideExpired: true }).catch(() => []),
      ]);
      if (shopList && shopList.length > 0) {
        setShops(shopList);
        setSelectedShop(shopList[0]);
      }
      setProducts(productList || []);
    } catch (err) {
      console.log("Failed to load map data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserGPS();
    loadData();
  }, [loadData]);

  // Search Address / Landmark via OpenStreetMap Geocoding
  const handleSearchGeocode = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearchingAddress(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`,
        {
          headers: { "Accept-Language": "en", "User-Agent": "ExpiryGo-Mobile-App/1.0" },
        }
      );
      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const targetLat = parseFloat(results[0].lat);
          const targetLng = parseFloat(results[0].lon);
          setUserLocation({ lat: targetLat, lng: targetLng });
          showToast(`✓ Centered on: ${results[0].display_name.split(",")[0]}`, "success");
        } else {
          showToast("No location found. Try adding city name.", "error");
        }
      }
    } catch {
      showToast("Search failed. Check network connection.", "error");
    } finally {
      setSearchingAddress(false);
    }
  };

  const handleCityTeleport = (city: typeof QUICK_CITIES[0]) => {
    setUserLocation({ lat: city.lat, lng: city.lng });
    showToast(`📍 Teleported to ${city.name}`, "success");
  };

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

  // Active Deals at selected shop
  const selectedShopDeals = useMemo(() => {
    if (!selectedShop) return [];
    return products.filter((p) => p.shop_id === selectedShop.id);
  }, [selectedShop, products]);

  const handleOpenGoogleMaps = (shop: ShopWithDescription) => {
    const lat = shop.latitude || 13.0827;
    const lng = shop.longitude || 80.2707;
    const label = encodeURIComponent(shop.name);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${label}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Store Location", `${shop.name}\n${shop.address}`);
    });
  };

  // Generate interactive Leaflet Real Map HTML with pins, satellite option, and live route polyline
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

    const tileLayerUrl =
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
              background-color: #0f172a;
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
            }).setView([userLat, userLng], 14);

            L.tileLayer('${tileLayerUrl}', {
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
            L.marker([userLat, userLng], { icon: userIcon }).addTo(map).bindPopup('<b>📍 Your Location</b>');

            let routeLine = null;

            function drawRoute(toLat, toLng) {
              if (routeLine) {
                map.removeLayer(routeLine);
              }
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
      {/* Top Search & Action Bar */}
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <View style={styles.searchInputContainer}>
            <Search size={16} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search store, street, or city..."
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchGeocode}
              returnKeyType="search"
            />
            {searchQuery.trim().length > 0 && (
              <TouchableOpacity
                style={styles.searchGoBtn}
                onPress={handleSearchGeocode}
                disabled={searchingAddress}
              >
                {searchingAddress ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.searchGoBtnText}>Go</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Satellite Layer Switcher */}
          <TouchableOpacity
            style={[
              styles.actionBtn,
              mapLayerType === "satellite" && { backgroundColor: "#2563eb", borderColor: "#3b82f6" },
            ]}
            onPress={() => setMapLayerType(mapLayerType === "streets" ? "satellite" : "streets")}
            activeOpacity={0.8}
          >
            <Eye size={16} color={mapLayerType === "satellite" ? "#FFF" : Colors.textPrimary} />
          </TouchableOpacity>

          {/* Live Locate Me GPS */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={fetchUserGPS}
            disabled={locating}
            activeOpacity={0.8}
          >
            {locating ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Locate size={16} color={Colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Indian Cities Teleport Strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.citiesScroll}
        >
          {QUICK_CITIES.map((city) => (
            <TouchableOpacity
              key={city.name}
              style={styles.cityChip}
              onPress={() => handleCityTeleport(city)}
              activeOpacity={0.75}
            >
              <Text style={styles.cityChipText}>📍 {city.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Status Toast */}
        {statusToast && (
          <View
            style={[
              styles.statusToast,
              statusToast.type === "success" && { backgroundColor: "#059669" },
              statusToast.type === "error" && { backgroundColor: "#dc2626" },
            ]}
          >
            <Text style={styles.statusToastText}>{statusToast.text}</Text>
          </View>
        )}
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

      {/* Map Canvas */}
      <View style={styles.mapCanvas}>
        {loading ? (
          <View style={styles.loaderArea}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={styles.loaderText}>Loading live GPS map & stores...</Text>
          </View>
        ) : (
          <WebView
            key={`map-${selectedRadius}-${selectedShop?.id}-${radiusFilteredShops.length}-${userLocation.lat}-${mapLayerType}`}
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

      {/* Store Details & Surplus Deals Bottom Sheet */}
      {selectedShop && !loading && (
        <View style={styles.selectedCard}>
          <View style={styles.selectedCardHeader}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Store size={16} color={Colors.primaryBright} />
                <Text style={styles.selectedShopName} numberOfLines={1}>
                  {selectedShop.name}
                </Text>
              </View>
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

          {/* Active Deals at this Store */}
          {selectedShopDeals.length > 0 && (
            <View style={styles.dealsSection}>
              <Text style={styles.dealsSectionTitle}>
                Surplus Deals ({selectedShopDeals.length})
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {selectedShopDeals.map((deal) => (
                  <View key={deal.id} style={styles.dealMiniCard}>
                    <Image
                      source={{ uri: deal.front_image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400" }}
                      style={styles.dealMiniImage}
                    />
                    <View style={{ flex: 1, justifyContent: "center" }}>
                      <Text style={styles.dealMiniTitle} numberOfLines={1}>
                        {deal.name}
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Text style={styles.dealMiniPrice}>₹{deal.discount_price.toFixed(0)}</Text>
                        <Text style={styles.dealMiniOriginal}>₹{deal.original_price.toFixed(0)}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.dealMiniReserveBtn}
                      onPress={() => navigation.navigate("ProductDetail", { product: deal })}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.dealMiniReserveText}>Reserve</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.selectedCardActions}>
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
              <Text style={styles.viewDealsText}>Browse All Deals</Text>
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
    paddingTop: Platform.OS === "ios" ? 50 : 36,
  },
  header: {
    paddingHorizontal: Spacing.md,
    marginBottom: 4,
    gap: 8,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    ...Shadows.soft,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  searchGoBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.sm,
  },
  searchGoBtnText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 11,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.soft,
  },
  citiesScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  cityChip: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  cityChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  statusToast: {
    alignSelf: "center",
    backgroundColor: "#2563eb",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
    marginTop: 2,
  },
  statusToastText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 11,
  },
  radiusRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    gap: 8,
    marginVertical: Spacing.xs,
  },
  radiusChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
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
    fontSize: 11,
  },
  radiusChipTextActive: {
    color: "#FFF",
  },
  mapCanvas: {
    flex: 1,
    marginHorizontal: Spacing.md,
    marginBottom: 8,
    borderRadius: 20,
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
    marginBottom: Platform.OS === "ios" ? 24 : 12,
    borderRadius: 20,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 10,
    ...Shadows.card,
  },
  selectedCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  selectedShopName: {
    ...Typography.title2,
    fontSize: 15,
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
  dealsSection: {
    gap: 6,
  },
  dealsSectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dealMiniCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: Radius.md,
    padding: 6,
    gap: 8,
    width: 220,
  },
  dealMiniImage: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: "#334155",
  },
  dealMiniTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  dealMiniPrice: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.primaryBright,
  },
  dealMiniOriginal: {
    fontSize: 10,
    color: Colors.textMuted,
    textDecorationLine: "line-through",
  },
  dealMiniReserveBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  dealMiniReserveText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 10,
  },
  selectedCardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  googleMapsBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
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
    paddingVertical: 10,
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
