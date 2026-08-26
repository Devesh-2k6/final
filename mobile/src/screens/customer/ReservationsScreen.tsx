import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { ShoppingBag, Truck, Store, Clock, CheckCircle2, AlertCircle } from "lucide-react-native";
import { Colors, Radius, Spacing, Typography } from "../../theme";
import { PinCodeDisplay } from "../../components/PinCodeDisplay";
import { EmptyState } from "../../components/EmptyState";
import { getMyReservations } from "../../services/reservations";
import { getMyOrders } from "../../services/orders";
import type { ApiReservation, ApiOrder } from "../../types";

interface ReservationsScreenProps {
  navigation: any;
}

export const ReservationsScreen: React.FC<ReservationsScreenProps> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<"pickups" | "deliveries">("pickups");
  const [reservations, setReservations] = useState<ApiReservation[]>([]);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [resList, ordList] = await Promise.all([
        getMyReservations().catch(() => []),
        getMyOrders().catch(() => []),
      ]);
      setReservations(resList);
      setOrders(ordList);
    } catch (err) {
      console.log("Failed to load user reservations/orders:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const renderReservationCard = ({ item }: { item: ApiReservation }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.productName}>{item.product?.name || "Surplus Product"}</Text>
            {item.product?.shop && (
              <View style={styles.shopRow}>
                <Store size={13} color={Colors.textMuted} />
                <Text style={styles.shopName}>{item.product.shop.name}</Text>
              </View>
            )}
          </View>
          <View
            style={[
              styles.statusPill,
              item.status === "COMPLETED"
                ? styles.statusPillCompleted
                : styles.statusPillPending,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                item.status === "COMPLETED"
                  ? { color: Colors.primaryBright }
                  : { color: Colors.amberBright },
              ]}
            >
              {item.status === "PENDING" ? "PENDING PICKUP" : item.status}
            </Text>
          </View>
        </View>

        {/* PIN Code Verification Component */}
        {item.status === "PENDING" && (
          <PinCodeDisplay pickupCode={item.pickup_code} />
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.qtyText}>Qty: {item.quantity} units</Text>
          <Text style={styles.totalPrice}>Total: ₹{Number(item.total_price ?? 0).toFixed(0)}</Text>
        </View>
      </View>
    );
  };

  const renderOrderCard = ({ item }: { item: ApiOrder }) => {
    const orderTotal = Number(item.total_price ?? 0) + Number(item.delivery_fee ?? 0);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.productName}>{item.product?.name || "Delivery Order"}</Text>
            <Text style={styles.addressText} numberOfLines={1}>
              Deliver to: {item.delivery_address || "Home Address"}
            </Text>
          </View>
          <View style={styles.statusPillDelivery}>
            <Text style={styles.statusTextDelivery}>{item.status.replace("_", " ")}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.qtyText}>Qty: {item.quantity}</Text>
          <Text style={styles.totalPrice}>
            Total: ₹{orderTotal.toFixed(0)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Rescued Pickups</Text>
        <Text style={styles.headerSub}>Show your PIN code at partner stores to collect meals</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "pickups" && styles.tabActive]}
          onPress={() => setActiveTab("pickups")}
          activeOpacity={0.8}
        >
          <ShoppingBag
            size={16}
            color={activeTab === "pickups" ? Colors.primaryBright : Colors.textMuted}
          />
          <Text
            style={[styles.tabText, activeTab === "pickups" && styles.tabTextActive]}
          >
            Store Pickups ({reservations.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "deliveries" && styles.tabActive]}
          onPress={() => setActiveTab("deliveries")}
          activeOpacity={0.8}
        >
          <Truck
            size={16}
            color={activeTab === "deliveries" ? Colors.primaryBright : Colors.textMuted}
          />
          <Text
            style={[styles.tabText, activeTab === "deliveries" && styles.tabTextActive]}
          >
            Deliveries ({orders.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content List */}
      {loading ? (
        <View style={styles.loaderArea}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : activeTab === "pickups" ? (
        <FlatList
          data={reservations}
          keyExtractor={(item) => item.id}
          renderItem={renderReservationCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primaryBright}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title="No active store pickups"
              description="Browse surplus deals in your neighborhood and reserve delicious items before they sell out!"
              actionText="Explore Deals"
              onAction={() => navigation.navigate("DealsTab")}
            />
          }
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primaryBright}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title="No delivery orders yet"
              description="You haven't placed any home delivery orders. Choose instant delivery when reserving a deal!"
              actionText="Browse Deals"
              onAction={() => navigation.navigate("DealsTab")}
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
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
  },
  headerTitle: {
    ...Typography.title1,
    fontSize: 22,
  },
  headerSub: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  tabsRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginVertical: Spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.card,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 6,
  },
  tabActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primaryGlow,
  },
  tabText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: "700",
  },
  tabTextActive: {
    color: Colors.primaryBright,
    fontWeight: "800",
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
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.xs,
  },
  productName: {
    ...Typography.bodyBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  shopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  shopName: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  statusPillPending: {
    backgroundColor: Colors.amberLight,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  statusPillCompleted: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primaryGlow,
  },
  statusPillDelivery: {
    backgroundColor: Colors.blueLight,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  statusText: {
    ...Typography.tag,
    fontSize: 9,
  },
  statusTextDelivery: {
    ...Typography.tag,
    color: Colors.blueBright,
    fontSize: 9,
  },
  addressText: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Spacing.xs,
    marginTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  qtyText: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  totalPrice: {
    fontSize: 15,
    fontWeight: "900",
    color: Colors.primaryBright,
  },
});
