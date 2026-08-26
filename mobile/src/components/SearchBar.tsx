import React, { useState } from "react";
import { View, TextInput, StyleSheet, TouchableOpacity, ScrollView, Text } from "react-native";
import { Search, X, SlidersHorizontal, ChefHat, Sparkles, QrCode } from "lucide-react-native";
import { Colors, Radius, Shadows, Spacing, Typography } from "../theme";
import type { ProductCategory } from "../types";

const CATEGORIES: { label: string; icon: string; value: ProductCategory | "ALL" }[] = [
  { label: "All Deals", icon: "🔥", value: "ALL" },
  { label: "Bakery", icon: "🥐", value: "BAKERY" },
  { label: "Dairy", icon: "🥛", value: "DAIRY" },
  { label: "Produce", icon: "🥗", value: "PRODUCE" },
  { label: "Meat", icon: "🥩", value: "MEAT" },
  { label: "Pantry", icon: "🥫", value: "PANTRY" },
  { label: "Meals", icon: "🍱", value: "PREPARED_FOOD" },
  { label: "Others", icon: "📦", value: "OTHER" },
];

interface SearchBarProps {
  query: string;
  onChangeQuery: (text: string) => void;
  selectedCategory: ProductCategory | "ALL";
  onSelectCategory: (category: ProductCategory | "ALL") => void;
  recipeMode: boolean;
  onToggleRecipeMode: () => void;
  onOpenFilters?: () => void;
  onOpenQrScanner?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  query,
  onChangeQuery,
  selectedCategory,
  onSelectCategory,
  recipeMode,
  onToggleRecipeMode,
  onOpenFilters,
  onOpenQrScanner,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {/* Main Search Row */}
      <View style={styles.searchRow}>
        <View style={[styles.inputContainer, isFocused && styles.inputContainerFocused]}>
          <Search size={18} color={isFocused ? Colors.primary : Colors.textMuted} />
          <TextInput
            style={styles.input}
            placeholder={
              recipeMode
                ? "Enter ingredients (milk, bread...)"
                : "Search surplus food, bakeries, meals..."
            }
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={onChangeQuery}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => onChangeQuery("")}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.clearBtn}
            >
              <X size={14} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Orange Accent Action Button */}
        <TouchableOpacity
          style={[styles.primaryActionBtn, recipeMode && styles.primaryActionBtnActive]}
          onPress={onToggleRecipeMode}
          activeOpacity={0.85}
        >
          <ChefHat size={20} color="#FFFFFF" strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      {/* Modern Circular Category Cards */}
      {!recipeMode && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.value;
            return (
              <TouchableOpacity
                key={cat.value}
                style={styles.categoryItem}
                onPress={() => onSelectCategory(cat.value)}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.categoryCircle,
                    isSelected && styles.categoryCircleActive,
                  ]}
                >
                  <Text style={styles.categoryIconEmoji}>{cat.icon}</Text>
                </View>
                <Text
                  style={[
                    styles.categoryLabel,
                    isSelected && styles.categoryLabelActive,
                  ]}
                  numberOfLines={1}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* AI Recipe Mode Banner */}
      {recipeMode && (
        <View style={styles.recipeBanner}>
          <View style={styles.recipeIconWrap}>
            <Sparkles size={16} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.recipeBannerTitle}>AI Zero-Waste Recipe Mode</Text>
            <Text style={styles.recipeBannerText}>
              Search what you have in your fridge or pantry to find matching surplus deals!
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
  },
  searchRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  inputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    height: 50,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    ...Shadows.soft,
  },
  inputContainerFocused: {
    borderColor: Colors.primary,
  },
  input: {
    flex: 1,
    marginLeft: Spacing.sm,
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: "500",
  },
  clearBtn: {
    padding: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.cardSurface,
  },
  qrBtn: {
    padding: 4,
  },
  primaryActionBtn: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.hover,
  },
  primaryActionBtnActive: {
    backgroundColor: Colors.textPrimary,
  },
  categoryScroll: {
    paddingTop: Spacing.md,
    paddingBottom: 4,
    gap: 16,
  },
  categoryItem: {
    alignItems: "center",
    width: 66,
  },
  categoryCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    marginBottom: 6,
    ...Shadows.soft,
  },
  categoryCircleActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  categoryIconEmoji: {
    fontSize: 22,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  categoryLabelActive: {
    color: Colors.primary,
    fontWeight: "800",
  },
  recipeBanner: {
    marginTop: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.primaryLight,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "rgba(255, 91, 38, 0.2)",
    gap: 10,
  },
  recipeIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    ...Shadows.soft,
  },
  recipeBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
    marginBottom: 2,
  },
  recipeBannerText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
});
