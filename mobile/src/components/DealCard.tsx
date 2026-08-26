import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import {
  Heart,
  Store,
  Sparkles,
  Plus,
  ArrowUpRight,
  Flame,
  Clock,
  ChefHat,
} from "lucide-react-native";
import { Colors, Radius, Shadows, Spacing, Typography } from "../theme";
import { formatExpiryDisplay, getFreshnessLevel } from "../lib/formatters";
import type { ApiProduct } from "../types";

interface DealCardProps {
  product: ApiProduct;
  onPress: (product: ApiProduct) => void;
  onReserve: (product: ApiProduct) => void;
  onToggleFavorite?: (productId: string) => void;
  isFavorite?: boolean;
  onOpenAiForecast?: (product: ApiProduct) => void;
  onToggleRecipeBasket?: (product: ApiProduct) => void;
  isInRecipeBasket?: boolean;
}

export const DealCard: React.FC<DealCardProps> = ({
  product,
  onPress,
  onReserve,
  onToggleFavorite,
  isFavorite = false,
  onOpenAiForecast,
  onToggleRecipeBasket,
  isInRecipeBasket = false,
}) => {
  const [imageError, setImageError] = useState(false);

  const price = product.current_price ?? product.discount_price;
  const discountPercent =
    product.original_price > 0
      ? Math.round(((product.original_price - price) / product.original_price) * 100)
      : 0;

  const expiry = formatExpiryDisplay(product.expiry_date);
  const freshness = getFreshnessLevel(product.expiry_date);

  const defaultImageUrl =
    "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600";
  const displayImage =
    !imageError && product.front_image_url ? product.front_image_url : defaultImageUrl;

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      style={styles.card}
      onPress={() => onPress(product)}
    >
      {/* Top Product Image Canvas */}
      <View style={styles.imageCanvas}>
        <Image
          source={{ uri: displayImage }}
          style={styles.image}
          onError={() => setImageError(true)}
          resizeMode="cover"
        />

        {/* Floating Discount Tag */}
        {discountPercent > 0 && (
          <View style={styles.discountBadge}>
            <Flame size={11} color="#FFF" />
            <Text style={styles.discountText}>{discountPercent}% OFF</Text>
          </View>
        )}

        {/* Favorite Heart Button */}
        {onToggleFavorite && (
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={() => onToggleFavorite(product.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.8}
          >
            <Heart
              size={17}
              color={isFavorite ? Colors.primary : "#94A3B8"}
              fill={isFavorite ? Colors.primary : "transparent"}
            />
          </TouchableOpacity>
        )}

        {/* Expiry Pill */}
        <View style={styles.expiryBadge}>
          <Clock size={10} color={Colors.textSecondary} />
          <Text style={styles.expiryText}>{expiry.compact}</Text>
        </View>
      </View>

      {/* Details Container */}
      <View style={styles.detailsContainer}>
        {/* Category & Store Meta */}
        <View style={styles.metaRow}>
          <Text style={styles.categoryText}>{product.category}</Text>
          {product.shop?.name && (
            <View style={styles.storePill}>
              <Store size={10} color={Colors.textMuted} />
              <Text style={styles.storeText} numberOfLines={1}>
                {product.shop.name}
              </Text>
            </View>
          )}
        </View>

        {/* Product Name */}
        <Text style={styles.productName} numberOfLines={1}>
          {product.name}
        </Text>

        {/* Bottom Price & Quick Action Button */}
        <View style={styles.footerRow}>
          <View style={styles.priceContainer}>
            <View style={styles.priceRow}>
              <Text style={styles.currency}>₹</Text>
              <Text style={styles.priceVal}>{price.toFixed(0)}</Text>
              {product.original_price > price && (
                <Text style={styles.originalPrice}>₹{product.original_price.toFixed(0)}</Text>
              )}
            </View>
            <Text style={styles.stockLabel}>{product.quantity} left in stock</Text>
          </View>

          {/* Quick Action Circular Buttons */}
          <View style={styles.actionsRow}>
            {onToggleRecipeBasket && (
              <TouchableOpacity
                style={[
                  styles.recipeButton,
                  isInRecipeBasket && styles.recipeButtonActive,
                ]}
                onPress={() => onToggleRecipeBasket(product)}
                activeOpacity={0.8}
                accessibilityLabel="Add to Recipe"
              >
                <ChefHat
                  size={15}
                  color={isInRecipeBasket ? "#FFF" : Colors.primary}
                />
              </TouchableOpacity>
            )}

            {onOpenAiForecast && (
              <TouchableOpacity
                style={styles.aiButton}
                onPress={() => onOpenAiForecast(product)}
                activeOpacity={0.8}
              >
                <Sparkles size={14} color={Colors.primary} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.reserveButton}
              onPress={() => onReserve(product)}
              activeOpacity={0.85}
            >
              <ArrowUpRight size={18} color="#FFF" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 22,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: "hidden",
    ...Shadows.card,
  },
  imageCanvas: {
    height: 175,
    backgroundColor: Colors.cardSurface,
    position: "relative",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  discountBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: Radius.full,
    ...Shadows.soft,
  },
  discountText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  favoriteButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.soft,
  },
  expiryBadge: {
    position: "absolute",
    bottom: 10,
    left: 12,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  expiryText: {
    color: Colors.textPrimary,
    fontSize: 11,
    fontWeight: "700",
  },
  detailsContainer: {
    padding: Spacing.md,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  categoryText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  storePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: "60%",
  },
  storeText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: "500",
  },
  productName: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 10,
    lineHeight: 22,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  priceContainer: {
    flex: 1,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
  },
  currency: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  priceVal: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  originalPrice: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: "500",
    textDecorationLine: "line-through",
    marginLeft: 6,
  },
  stockLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    fontWeight: "500",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recipeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  recipeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  aiButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  reserveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.hover,
  },
});
