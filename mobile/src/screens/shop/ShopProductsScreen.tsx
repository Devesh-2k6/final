import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Plus, Edit2, Trash2, Clock } from "lucide-react-native";
import { Colors, Radius, Shadows, Spacing, Typography } from "../../theme";
import { formatExpiryDisplay, getFreshnessLevel } from "../../lib/formatters";
import { EmptyState } from "../../components/EmptyState";
import { getProducts, deleteProduct } from "../../services/products";
import { getMyShop } from "../../services/shops";
import type { ApiProduct } from "../../types";

interface ShopProductsScreenProps {
  navigation: any;
}

export const ShopProductsScreen: React.FC<ShopProductsScreenProps> = ({ navigation }) => {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      // Scope to the owner's own shop; include expired so they can still manage them.
      const myShop = await getMyShop();
      const data = await getProducts({ shopId: myShop.id, hideExpired: false });
      setProducts(data);
    } catch (err) {
      console.log("Error loading shop products:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
      // Auto-sync shop products list every 4 seconds
      const interval = setInterval(() => {
        loadProducts();
      }, 4000);
      return () => clearInterval(interval);
    }, [loadProducts])
  );

  const handleDelete = (id: string, name: string) => {
    Alert.alert("Remove Deal", `Are you sure you want to remove ${name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteProduct(id);
            setProducts((prev) => prev.filter((p) => p.id !== id));
          } catch (err) {
            Alert.alert("Error", "Failed to delete product deal.");
          }
        },
      },
    ]);
  };

  const renderProductItem = ({ item }: { item: ApiProduct }) => {
    const price = item.current_price ?? item.discount_price ?? 0;
    const origPrice = item.original_price ?? 0;
    const expiry = formatExpiryDisplay(item.expiry_date);
    const freshness = getFreshnessLevel(item.expiry_date);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.category}>{item.category.replace("_", " ")}</Text>
            <Text style={styles.name}>{item.name}</Text>
          </View>

          <View style={[styles.freshnessTag, { backgroundColor: freshness.bgColor }]}>
            <Text style={[styles.freshnessText, { color: freshness.color }]}>
              {freshness.label}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View>
            <Text style={styles.price}>
              ₹{Number(price).toFixed(0)}{" "}
              <Text style={styles.origPrice}>₹{Number(origPrice).toFixed(0)}</Text>
            </Text>
            <Text style={styles.stock}>Stock: {item.quantity} units available</Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => navigation.navigate("AddProduct", { product: item })}
            >
              <Edit2 size={16} color={Colors.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDelete(item.id, item.name)}
            >
              <Trash2 size={16} color={Colors.rose} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footerRow}>
          <Clock size={12} color={Colors.textMuted} />
          <Text style={styles.expiryText}>
            Expires: {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : "N/A"} ({expiry.compact})
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Active Inventory Deals</Text>
          <Text style={styles.headerSub}>Manage your surplus products & prices</Text>
        </View>

        <TouchableOpacity
          style={styles.addHeaderBtn}
          onPress={() => navigation.navigate("AddProduct")}
          activeOpacity={0.88}
        >
          <Plus size={18} color="#FFFFFF" />
          <Text style={styles.addHeaderBtnText}>Add Deal</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loaderArea}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderProductItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadProducts();
              }}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title="No active inventory"
              description="Start saving food from waste by listing your first discounted deal."
              actionText="List a Surplus Deal"
              onAction={() => navigation.navigate("AddProduct")}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 50,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  headerSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  addHeaderBtn: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.full,
    gap: 4,
    ...Shadows.soft,
  },
  addHeaderBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },
  loaderArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 90,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: Spacing.md,
    ...Shadows.soft,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.xs,
  },
  category: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  freshnessTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  freshnessText: {
    fontSize: 10,
    fontWeight: "800",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: Spacing.xs,
  },
  price: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.primary,
  },
  origPrice: {
    fontSize: 13,
    color: Colors.textMuted,
    textDecorationLine: "line-through",
  },
  stock: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.cardSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.roseLight,
    alignItems: "center",
    justifyContent: "center",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: Spacing.xs,
    marginTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  expiryText: {
    color: Colors.textMuted,
    fontSize: 11,
  },
});
