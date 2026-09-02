import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  Sparkles,
  Flame,
  ChefHat,
  Check,
  X,
  ArrowRight,
  Zap,
  TrendingDown,
  Leaf,
  ShoppingBag,
} from "lucide-react-native";
import { Colors, Radius, Shadows, Spacing, Typography } from "../../theme";
import { CustomHeader } from "../../components/CustomHeader";
import { SearchBar } from "../../components/SearchBar";
import { DealCard } from "../../components/DealCard";
import { AiForecastModal } from "../../components/AiForecastModal";
import { CameraScannerModal } from "../../components/CameraScannerModal";
import { EmptyState } from "../../components/EmptyState";
import {
  getProducts,
  getDeepSearchResults,
  generateRecipe,
  addFavorite,
  removeFavorite,
  getFavorites,
} from "../../services/products";
import { createReservation } from "../../services/reservations";
import { useRealtimeDeals } from "../../hooks/useRealtimeDeals";
import type { ApiProduct, ProductCategory, ApiRecipeResponse } from "../../types";

interface DealsFeedScreenProps {
  navigation: any;
}

export const DealsFeedScreen: React.FC<DealsFeedScreenProps> = ({ navigation }) => {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ProductCategory | "ALL">("ALL");
  const [recipeMode, setRecipeMode] = useState(false);
  const [selectedProductForAi, setSelectedProductForAi] = useState<ApiProduct | null>(null);
  const [qrScannerVisible, setQrScannerVisible] = useState(false);

  // Recipe basket
  const [recipeBasket, setRecipeBasket] = useState<ApiProduct[]>([]);
  const [recipeModalVisible, setRecipeModalVisible] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<ApiRecipeResponse | null>(null);
  const [generatingRecipe, setGeneratingRecipe] = useState(false);

  // Favorites
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // Reservation Feedback Modal
  const [reservedProduct, setReservedProduct] = useState<{
    product: ApiProduct;
    pickupCode: string;
  } | null>(null);

  const fetchDeals = useCallback(async () => {
    try {
      if (query.trim() || recipeMode) {
        const res = await getDeepSearchResults({
          q: query.trim(),
          semantic: true,
          recipeMode,
        });
        if (res.recipe_mode) {
          setProducts(res.matched_deals);
        } else {
          setProducts(res.products);
        }
      } else {
        const params = category !== "ALL" ? { category } : {};
        const deals = await getProducts(params);
        setProducts(deals);
      }
    } catch (err) {
      console.log("Error fetching deals:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [query, category, recipeMode]);

  const loadFavorites = useCallback(async () => {
    try {
      const favs = await getFavorites();
      setFavoriteIds(new Set(favs.map((f) => f.product_id)));
    } catch {
      // Not logged in
    }
  }, []);

  // Connect Real-Time Live WebSocket synchronization
  useRealtimeDeals({
    onNewDeal: (newProduct) => {
      setProducts((prev) => {
        if (prev.some((p) => p.id === newProduct.id)) return prev;
        if (category !== "ALL" && newProduct.category !== category) return prev;
        return [newProduct, ...prev];
      });
    },
    onUpdateDeal: (updatedProduct) => {
      setProducts((prev) =>
        prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
      );
    },
    onDeleteDeal: (deletedId) => {
      setProducts((prev) => prev.filter((p) => p.id !== deletedId));
    },
    onRefreshNeeded: () => {
      fetchDeals();
    },
  });

  useFocusEffect(
    useCallback(() => {
      fetchDeals();
      loadFavorites();

      // Real-time live sync fallback: refresh deals every 4 seconds while screen is active
      const interval = setInterval(() => {
        if (!query.trim() && !recipeMode) {
          fetchDeals();
        }
      }, 4000);

      return () => clearInterval(interval);
    }, [fetchDeals, loadFavorites, query, recipeMode])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDeals();
    loadFavorites();
  };

  const handleToggleFavorite = async (productId: string) => {
    const isFav = favoriteIds.has(productId);
    const newSet = new Set(favoriteIds);
    if (isFav) {
      newSet.delete(productId);
      setFavoriteIds(newSet);
      try {
        await removeFavorite(productId);
      } catch {
        newSet.add(productId);
        setFavoriteIds(new Set(newSet));
      }
    } else {
      newSet.add(productId);
      setFavoriteIds(newSet);
      try {
        await addFavorite(productId);
      } catch {
        newSet.delete(productId);
        setFavoriteIds(new Set(newSet));
      }
    }
  };

  const handleReserve = async (product: ApiProduct) => {
    try {
      const res = await createReservation(product.id, 1);
      setReservedProduct({
        product,
        pickupCode: res.pickup_code,
      });
      fetchDeals();
    } catch (err: any) {
      navigation.navigate("ProductDetail", { productId: product.id });
    }
  };

  const handleToggleRecipeBasket = (product: ApiProduct) => {
    const exists = recipeBasket.some((p) => p.id === product.id);
    if (exists) {
      setRecipeBasket(recipeBasket.filter((p) => p.id !== product.id));
    } else {
      setRecipeBasket([...recipeBasket, product]);
    }
  };

  const handleCookWithBasket = async () => {
    if (recipeBasket.length === 0) return;
    setRecipeModalVisible(true);
    setGeneratingRecipe(true);
    try {
      const payload = recipeBasket.map((p) => ({
        name: p.name,
        category: p.category,
        quantity: 1,
      }));
      const recipe = await generateRecipe(payload);
      setGeneratedRecipe(recipe);
    } catch (err) {
      console.log("Failed to generate recipe:", err);
    } finally {
      setGeneratingRecipe(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <CustomHeader
        title="ExpiryGo"
        subtitle="Rescue surplus quality food"
        onPressNotifications={() => navigation.navigate("Notifications")}
        showRoleToggle={true}
      />

      {/* Modern Search & Category Circular Bar */}
      <SearchBar
        query={query}
        onChangeQuery={setQuery}
        selectedCategory={category}
        onSelectCategory={setCategory}
        recipeMode={recipeMode}
        onToggleRecipeMode={() => setRecipeMode(!recipeMode)}
        onOpenQrScanner={() => setQrScannerVisible(true)}
      />

      {/* Main Deals Feed */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loaderText}>Finding surplus deals near you...</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
          ListHeaderComponent={
            products.length > 0 ? (
              <>
                {/* Featured Promo Hero Card */}
                {!query && (
                  <TouchableOpacity
                    style={styles.heroPromoBanner}
                    activeOpacity={0.92}
                    onPress={() => {
                      if (products[0]) {
                        navigation.navigate("ProductDetail", { productId: products[0].id });
                      }
                    }}
                  >
                    <Image
                      source={{
                        uri:
                          products[0]?.front_image_url ||
                          "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800",
                      }}
                      style={styles.promoImage}
                      resizeMode="cover"
                    />
                    <View style={styles.promoOverlay} />
                    <View style={styles.promoContent}>
                      <View style={styles.promoTag}>
                        <Flame size={12} color="#FFF" />
                        <Text style={styles.promoTagText}>FLASH SURPLUS RESCUE</Text>
                      </View>
                      <Text style={styles.promoTitle} numberOfLines={2}>
                        {products[0]?.name}
                      </Text>
                      <Text style={styles.promoSub}>
                        Save up to 70% • Verified Store Freshness
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                {/* Feed Header */}
                <View style={styles.feedHeaderRow}>
                  <Text style={styles.feedHeaderTitle}>Popular Surplus Deals</Text>
                  <TouchableOpacity onPress={() => setCategory("ALL")}>
                    <Text style={styles.feedHeaderLink}>See All</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null
          }
          renderItem={({ item }) => (
            <DealCard
              product={item}
              onPress={(prod) =>
                navigation.navigate("ProductDetail", { productId: prod.id })
              }
              onReserve={handleReserve}
              onToggleFavorite={handleToggleFavorite}
              isFavorite={favoriteIds.has(item.id)}
              onOpenAiForecast={(prod) => setSelectedProductForAi(prod)}
              onToggleRecipeBasket={handleToggleRecipeBasket}
              isInRecipeBasket={recipeBasket.some((p) => p.id === item.id)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title="No surplus deals active"
              description="No surplus products have been posted yet. Switch to Store Mode to list your first live deal!"
              actionText="Switch to Store Mode"
              onAction={() => {
                setCategory("ALL");
                setQuery("");
                setRecipeMode(false);
                navigation.navigate("ProfileTab");
              }}
            />
          }
        />
      )}

      {/* Floating Recipe Basket Cook Button */}
      {recipeBasket.length > 0 && (
        <TouchableOpacity
          style={styles.floatingRecipeBar}
          activeOpacity={0.9}
          onPress={handleCookWithBasket}
        >
          <View style={styles.recipeBarLeft}>
            <View style={styles.recipeIconBadge}>
              <ChefHat size={18} color="#FFF" />
            </View>
            <View>
              <Text style={styles.recipeBarCount}>
                {recipeBasket.length} {recipeBasket.length === 1 ? "Deal" : "Deals"} in Basket
              </Text>
              <Text style={styles.recipeBarSub}>AI Zero-Waste Chef Ready</Text>
            </View>
          </View>
          <View style={styles.recipeBarRight}>
            <Text style={styles.recipeBarAction}>Cook Recipe</Text>
            <Sparkles size={16} color="#FFF" />
          </View>
        </TouchableOpacity>
      )}

      {/* AI Surplus Forecast Modal */}
      <AiForecastModal
        product={selectedProductForAi}
        visible={!!selectedProductForAi}
        onClose={() => setSelectedProductForAi(null)}
      />

      {/* Reservation Success Modal */}
      <Modal
        visible={!!reservedProduct}
        transparent
        animationType="fade"
        onRequestClose={() => setReservedProduct(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <Check size={28} color="#FFF" />
            </View>
            <Text style={styles.successTitle}>Reservation Confirmed!</Text>
            <Text style={styles.successSub}>
              Your stock for{" "}
              <Text style={{ color: Colors.primary, fontWeight: "700" }}>
                {reservedProduct?.product.name}
              </Text>{" "}
              is held.
            </Text>

            <View style={styles.pinCard}>
              <Text style={styles.pinCardLabel}>Your Pickup PIN Code</Text>
              <Text style={styles.pinCardCode}>{reservedProduct?.pickupCode}</Text>
            </View>

            <TouchableOpacity
              style={styles.viewReservationsBtn}
              onPress={() => {
                setReservedProduct(null);
                navigation.navigate("ReservationsTab");
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.viewReservationsText}>View in My Pickups</Text>
              <ArrowRight size={16} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={() => setReservedProduct(null)}
            >
              <Text style={styles.dismissText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Recipe Modal */}
      <Modal
        visible={recipeModalVisible}
        animationType="slide"
        onRequestClose={() => setRecipeModalVisible(false)}
      >
        <View style={styles.recipeModalContainer}>
          <View style={styles.recipeModalHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ChefHat size={22} color={Colors.primary} />
              <Text style={styles.recipeModalTitle}>AI Zero-Waste Chef</Text>
            </View>
            <TouchableOpacity onPress={() => setRecipeModalVisible(false)}>
              <X size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {generatingRecipe ? (
            <View style={styles.recipeLoading}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.recipeLoadingText}>
                Crafting a gourmet recipe from your expiring ingredients...
              </Text>
            </View>
          ) : generatedRecipe ? (
            <ScrollView contentContainerStyle={styles.recipeContent}>
              <Text style={styles.recipeName}>{generatedRecipe.recipe_name}</Text>
              <Text style={styles.recipeDesc}>{generatedRecipe.description}</Text>

              <View style={styles.recipeMetaRow}>
                <View style={styles.recipeMetaPill}>
                  <Text style={styles.recipeMetaText}>⏱ Prep: {generatedRecipe.prep_time}</Text>
                </View>
                <View style={styles.recipeMetaPill}>
                  <Text style={styles.recipeMetaText}>🍳 Cook: {generatedRecipe.cook_time}</Text>
                </View>
                <View style={styles.recipeMetaPill}>
                  <Text style={styles.recipeMetaText}>★ {generatedRecipe.difficulty}</Text>
                </View>
              </View>

              {/* Ingredients */}
              <Text style={styles.sectionHeader}>Ingredients</Text>
              {generatedRecipe.ingredients.map((ing, idx) => (
                <View key={idx} style={styles.ingRow}>
                  <Text style={styles.ingBullet}>•</Text>
                  <Text style={styles.ingName}>
                    {ing.name} ({ing.quantity})
                  </Text>
                  {ing.is_deal && (
                    <View style={styles.dealPill}>
                      <Text style={styles.dealPillText}>Rescued Deal</Text>
                    </View>
                  )}
                </View>
              ))}

              {/* Steps */}
              <Text style={[styles.sectionHeader, { marginTop: Spacing.lg }]}>Cooking Steps</Text>
              {generatedRecipe.instructions.map((step) => (
                <View key={step.step_number} style={styles.stepCard}>
                  <Text style={styles.stepNumber}>Step {step.step_number}</Text>
                  <Text style={styles.stepText}>{step.instruction}</Text>
                </View>
              ))}
            </ScrollView>
          ) : null}
        </View>
      </Modal>

      {/* Live Scanner Modal */}
      <CameraScannerModal
        visible={qrScannerVisible}
        onClose={() => setQrScannerVisible(false)}
        mode="barcode"
        onBarcodeDetected={(data) => {
          if (data.name) {
            setQuery(data.name);
          } else if (data.barcode) {
            setQuery(data.barcode);
          }
        }}
        onQrScanned={(data) => {
          setQuery(data);
        }}
        onNavigateToDealsWithQuery={(q) => {
          setQuery(q);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
  },
  loaderText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 100,
  },
  heroPromoBanner: {
    height: 170,
    borderRadius: 24,
    overflow: "hidden",
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    position: "relative",
    ...Shadows.soft,
  },
  promoImage: {
    width: "100%",
    height: "100%",
  },
  promoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(18, 24, 38, 0.45)",
  },
  promoContent: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
  },
  promoTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  promoTagText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "800",
  },
  promoTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  promoSub: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.85)",
    marginTop: 2,
    fontWeight: "500",
  },
  feedHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: Spacing.sm,
  },
  feedHeaderTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  feedHeaderLink: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
  },
  floatingRecipeBar: {
    position: "absolute",
    bottom: 24,
    left: Spacing.md,
    right: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    ...Shadows.hover,
  },
  recipeBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  recipeIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  recipeBarCount: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },
  recipeBarSub: {
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "600",
    fontSize: 10,
  },
  recipeBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  recipeBarAction: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  successCard: {
    backgroundColor: Colors.card,
    borderRadius: 26,
    padding: Spacing.xl,
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    ...Shadows.card,
  },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
    ...Shadows.hover,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  successSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  pinCard: {
    backgroundColor: Colors.cardSurface,
    padding: Spacing.md,
    borderRadius: 16,
    width: "100%",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  pinCardLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  pinCardCode: {
    fontSize: 26,
    fontWeight: "900",
    color: Colors.primary,
    letterSpacing: 4,
  },
  viewReservationsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    width: "100%",
    paddingVertical: 14,
    borderRadius: Radius.full,
    marginBottom: 8,
    ...Shadows.hover,
  },
  viewReservationsText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
  dismissBtn: {
    paddingVertical: 8,
  },
  dismissText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  recipeModalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  recipeModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    backgroundColor: Colors.card,
  },
  recipeModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  recipeLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  recipeLoadingText: {
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: Spacing.md,
    fontSize: 14,
    lineHeight: 20,
  },
  recipeContent: {
    padding: Spacing.md,
  },
  recipeName: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  recipeDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  recipeMetaRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: Spacing.lg,
  },
  recipeMetaPill: {
    backgroundColor: Colors.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  recipeMetaText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  ingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  ingBullet: {
    fontSize: 14,
    color: Colors.primary,
  },
  ingName: {
    fontSize: 14,
    color: Colors.textPrimary,
    flex: 1,
  },
  dealPill: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  dealPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.primary,
  },
  stepCard: {
    backgroundColor: Colors.card,
    padding: Spacing.md,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.primary,
    marginBottom: 4,
  },
  stepText: {
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 19,
  },
});
