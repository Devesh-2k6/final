import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import {
  ArrowLeft,
  Store,
  MapPin,
  Clock,
  Sparkles,
  Heart,
  Plus,
  Minus,
  ShoppingBag,
  Share2,
  Flame,
  Truck,
  Check,
} from "lucide-react-native";
import { Colors, Radius, Shadows, Spacing, Typography } from "../../theme";
import { formatExpiryDisplay, getFreshnessLevel } from "../../lib/formatters";
import { calculateAiForecast } from "../../lib/forecast";
import { getProducts, addFavorite, removeFavorite, getFavorites } from "../../services/products";
import { createReservation } from "../../services/reservations";
import { PinCodeDisplay } from "../../components/PinCodeDisplay";
import type { ApiProduct } from "../../types";

interface ProductDetailScreenProps {
  route: any;
  navigation: any;
}

export const ProductDetailScreen: React.FC<ProductDetailScreenProps> = ({
  route,
  navigation,
}) => {
  const { productId } = route.params || {};
  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [reservedPickupCode, setReservedPickupCode] = useState<string | null>(null);
  const [reserving, setReserving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeThumb, setActiveThumb] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        const deals = await getProducts();
        const found = deals.find((p) => p.id === productId);
        if (found) {
          setProduct(found);
        }
        const favs = await getFavorites().catch(() => []);
        setIsFavorite(favs.some((f) => f.product_id === productId));
      } catch (err) {
        console.log("Failed to load product detail:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [productId]);

  const handleToggleFavorite = async () => {
    if (!product) return;
    const next = !isFavorite;
    setIsFavorite(next);
    try {
      if (next) {
        await addFavorite(product.id);
      } else {
        await removeFavorite(product.id);
      }
    } catch {
      setIsFavorite(!next);
    }
  };

  const handleReserve = async () => {
    if (!product) return;
    setReserving(true);
    setError(null);
    try {
      const res = await createReservation(product.id, quantity);
      setReservedPickupCode(res.pickup_code);
    } catch (err: any) {
      setError(err.message || "Failed to make reservation.");
    } finally {
      setReserving(false);
    }
  };

  const handleCheckoutDelivery = () => {
    if (!product) return;
    navigation.navigate("Checkout", { product, quantity });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Product deal not found.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const price = product.current_price ?? product.discount_price;
  const discountPercent =
    product.original_price > 0
      ? Math.round(((product.original_price - price) / product.original_price) * 100)
      : 0;

  const expiry = formatExpiryDisplay(product.expiry_date);
  const freshness = getFreshnessLevel(product.expiry_date);
  const forecast = calculateAiForecast(
    product.original_price,
    price,
    product.quantity,
    product.expiry_date
  );

  const defaultImage =
    "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600";
  const displayImage = product.front_image_url || defaultImage;

  const thumbnails = [
    displayImage,
    product.expiry_image_url || displayImage,
    "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600",
  ];

  return (
    <View style={styles.container}>
      {/* Top Header Navigation */}
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.navCircle} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.navTitle}>Details Product</Text>

        <TouchableOpacity style={styles.navCircle} onPress={handleToggleFavorite}>
          <Heart
            size={19}
            color={isFavorite ? Colors.primary : Colors.textPrimary}
            fill={isFavorite ? Colors.primary : "transparent"}
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Floating Hero Stage */}
        <View style={styles.heroStage}>
          <Image
            source={{ uri: thumbnails[activeThumb] }}
            style={styles.heroImage}
            resizeMode="cover"
          />

          {/* Discount Pill */}
          {discountPercent > 0 && (
            <View style={styles.discountBadge}>
              <Flame size={12} color="#FFF" />
              <Text style={styles.discountText}>{discountPercent}% OFF</Text>
            </View>
          )}
        </View>

        {/* Thumbnail Selector Strip */}
        <View style={styles.thumbStrip}>
          {thumbnails.map((img, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.thumbBox, activeThumb === idx && styles.thumbBoxActive]}
              onPress={() => setActiveThumb(idx)}
              activeOpacity={0.8}
            >
              <Image source={{ uri: img }} style={styles.thumbImg} resizeMode="cover" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Product Details Section */}
        <View style={styles.detailsBody}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.categoryName}>{product.category}</Text>
              <Text style={styles.productName}>{product.name}</Text>
            </View>
          </View>

          {/* Freshness & Rescue Urgency Pills */}
          <Text style={styles.sectionHeading}>Freshness & Shelf Life</Text>
          <View style={styles.pillsRow}>
            <View style={[styles.infoPill, { backgroundColor: Colors.primaryLight }]}>
              <Clock size={13} color={Colors.primary} />
              <Text style={[styles.infoPillText, { color: Colors.primary }]}>{expiry.compact}</Text>
            </View>

            <View style={[styles.infoPill, { backgroundColor: "#F0FDF4" }]}>
              <Sparkles size={13} color="#16A34A" />
              <Text style={[styles.infoPillText, { color: "#16A34A" }]}>
                {forecast.rescueProbability}% Rescue Rate
              </Text>
            </View>

            <View style={[styles.infoPill, { backgroundColor: Colors.cardSurface }]}>
              <Text style={[styles.infoPillText, { color: Colors.textSecondary }]}>
                {product.quantity} Available
              </Text>
            </View>
          </View>

          {/* Description & About Item */}
          <Text style={[styles.sectionHeading, { marginTop: Spacing.md }]}>About Item</Text>
          <Text style={styles.descriptionText}>
            {product.description ||
              "Rescue quality surplus food prepared fresh by verified local partner merchants. Reduce environmental waste and enjoy top culinary items at maximum discount."}
          </Text>

          {/* Quantity Stepper & Bulk Tier Pricing */}
          {!reservedPickupCode && product.quantity > 0 && (
            <View style={styles.quantitySection}>
              <View style={styles.quantityRow}>
                <View>
                  <Text style={styles.sectionHeading}>Select Quantity</Text>
                  <Text style={styles.unitPriceText}>₹{price.toFixed(0)} / unit</Text>
                </View>
                <View style={styles.stepperContainer}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <Minus size={16} color={Colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.stepQty}>{quantity}</Text>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setQuantity(Math.min(product.quantity, quantity + 1))}
                  >
                    <Plus size={16} color={Colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Bulk Quantity Incentive Pill */}
              <View
                style={[
                  styles.bulkIncentivePill,
                  quantity >= 2 && styles.bulkIncentivePillActive,
                ]}
              >
                <Sparkles size={13} color={quantity >= 2 ? Colors.primary : Colors.textMuted} />
                <Text
                  style={[
                    styles.bulkIncentiveText,
                    quantity >= 2 && styles.bulkIncentiveTextActive,
                  ]}
                >
                  {quantity >= 4
                    ? `🔥 10% Bulk Discount Applied (-₹${((price * quantity * 10) / 100).toFixed(0)})!`
                    : quantity >= 2
                    ? `🎉 5% Bulk Discount Applied (-₹${((price * quantity * 5) / 100).toFixed(0)})! Buy 4+ for 10% off.`
                    : "Buy 2+ for extra 5% bulk off, 4+ for 10% off!"}
                </Text>
              </View>
            </View>
          )}

          {/* Store Location Card */}
          {product.shop && (
            <View style={styles.storeCard}>
              <View style={styles.storeIconWrap}>
                <Store size={18} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.storeName}>{product.shop.name}</Text>
                <View style={styles.storeAddressRow}>
                  <MapPin size={12} color={Colors.textMuted} />
                  <Text style={styles.storeAddress} numberOfLines={1}>
                    {product.shop.address}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Reserved Pickup Code Display */}
          {reservedPickupCode && <PinCodeDisplay pickupCode={reservedPickupCode} />}

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky Bottom Price & Action Button Bar */}
      {!reservedPickupCode && product.quantity > 0 && (
        <View style={styles.stickyFooter}>
          <View style={styles.footerPriceCol}>
            <Text style={styles.footerPriceLabel}>Total Deal Price</Text>
            <View style={styles.footerPriceRow}>
              <Text style={styles.footerCurrency}>₹</Text>
              <Text style={styles.footerPrice}>
                {(
                  price * quantity -
                  (price * quantity * (quantity >= 4 ? 10 : quantity >= 2 ? 5 : 0)) / 100
                ).toFixed(0)}
              </Text>
              {quantity >= 2 && (
                <Text style={styles.footerOldPrice}>₹{(price * quantity).toFixed(0)}</Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={styles.primaryCartBtn}
            onPress={handleReserve}
            activeOpacity={0.88}
            disabled={reserving}
          >
            {reserving ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <ShoppingBag size={18} color="#FFF" />
                <Text style={styles.primaryCartBtnText}>Reserve Deal</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  topNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingTop: 12,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
  },
  navCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.soft,
  },
  navTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  heroStage: {
    marginHorizontal: Spacing.md,
    height: 250,
    backgroundColor: Colors.cardSurface,
    borderRadius: 26,
    overflow: "hidden",
    position: "relative",
    ...Shadows.soft,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  discountBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    ...Shadows.soft,
  },
  discountText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  thumbStrip: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: Spacing.md,
    marginTop: 14,
  },
  thumbBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    overflow: "hidden",
    ...Shadows.soft,
  },
  thumbBoxActive: {
    borderColor: Colors.primary,
  },
  thumbImg: {
    width: "100%",
    height: "100%",
  },
  detailsBody: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.lg,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  productName: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: -0.4,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: Spacing.md,
  },
  infoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
  },
  infoPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  descriptionText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  quantitySection: {
    marginVertical: Spacing.sm,
    gap: 6,
  },
  quantityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  unitPriceText: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontSize: 11,
  },
  bulkIncentivePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.cardSurface,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  bulkIncentivePillActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primaryGlow,
  },
  bulkIncentiveText: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  bulkIncentiveTextActive: {
    color: Colors.primary,
    fontWeight: "700",
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 4,
    ...Shadows.soft,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.cardSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  stepQty: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.textPrimary,
    paddingHorizontal: 14,
  },
  storeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginTop: Spacing.sm,
    ...Shadows.soft,
  },
  storeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  storeName: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  storeAddressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  storeAddress: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  errorBanner: {
    backgroundColor: Colors.roseLight,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
  },
  errorBannerText: {
    color: Colors.rose,
    fontSize: 13,
    fontWeight: "600",
  },
  stickyFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.card,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderColor: Colors.cardBorder,
    ...Shadows.card,
  },
  footerPriceCol: {
    justifyContent: "center",
  },
  footerPriceLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  footerPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  footerCurrency: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  footerPrice: {
    fontSize: 22,
    fontWeight: "900",
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  footerOldPrice: {
    fontSize: 14,
    color: Colors.textMuted,
    textDecorationLine: "line-through",
    marginLeft: 4,
  },
  primaryCartBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: Radius.full,
    ...Shadows.hover,
  },
  primaryCartBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  errorText: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
  backBtn: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },
  backBtnText: {
    color: "#FFF",
    fontWeight: "700",
  },
});
