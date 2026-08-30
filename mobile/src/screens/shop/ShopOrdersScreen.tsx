import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  Truck,
  ShoppingBag,
  Store,
  Clock,
  Phone,
  MapPin,
  ArrowRight,
  QrCode,
  Camera,
} from "lucide-react-native";
import { Colors, Radius, Spacing, Typography } from "../../theme";
import { EmptyState } from "../../components/EmptyState";
import { CameraScannerModal } from "../../components/CameraScannerModal";
import { getShopReservations, verifyReservation } from "../../services/reservations";
import { getShopOrders, updateOrderStatus } from "../../services/orders";
import type { ApiReservation, ApiOrder, OrderStatus } from "../../types";

interface ShopOrdersScreenProps {
  navigation: any;
}

export const ShopOrdersScreen: React.FC<ShopOrdersScreenProps> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<"verify" | "deliveries">("verify");
  const [pinCode, setPinCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<{ text: string; success: boolean } | null>(
    null
  );
  const [qrScannerVisible, setQrScannerVisible] = useState(false);

  const [reservations, setReservations] = useState<ApiReservation[]>([]);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [resList, ordList] = await Promise.all([
        getShopReservations().catch(() => []),
        getShopOrders().catch(() => []),
      ]);
      setReservations(resList);
      setOrders(ordList);
    } catch (err) {
      console.log("Error loading shop orders:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
      const interval = setInterval(() => {
        loadData();
      }, 4000);
      return () => clearInterval(interval);
    }, [loadData])
  );

  const performVerification = async (targetCode: string) => {
    const cleanCode = targetCode.trim();
    if (!cleanCode || cleanCode.length < 4) {
      Alert.alert("Invalid Code", "Please enter or scan a valid 6-digit pickup PIN.");
      return;
    }

    setVerifying(true);
    setVerifyMessage(null);

    // Search matching reservation in shop queue (case-insensitive)
    let matched = reservations.find(
      (r) => r.pickup_code?.toUpperCase() === cleanCode.toUpperCase() && r.status === "PENDING"
    );

    if (!matched) {
      try {
        const freshList = await getShopReservations();
        setReservations(freshList);
        matched = freshList.find(
          (r) => r.pickup_code?.toUpperCase() === cleanCode.toUpperCase() && r.status === "PENDING"
        );
      } catch (err) {
        console.log("Failed to refresh reservations for PIN check:", err);
      }
    }

    if (matched) {
      try {
        await verifyReservation(matched.id, matched.pickup_code);
        setVerifyMessage({
          text: `✅ Verified! Hand over ${matched.quantity}x ${matched.product?.name || "Deal"} to customer.`,
          success: true,
        });
        setPinCode("");
        loadData();
      } catch (err: any) {
        setVerifyMessage({
          text: err.message || "Failed to verify PIN.",
          success: false,
        });
      } finally {
        setVerifying(false);
      }
    } else {
      setVerifying(false);
      setVerifyMessage({
        text: `No active reservation found matching PIN: ${cleanCode}`,
        success: false,
      });
    }
  };

  const handleQrScanned = (scannedCode: string) => {
    setPinCode(scannedCode);
    performVerification(scannedCode);
  };

  const handleUpdateOrderStatus = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, nextStatus);
      await loadData();
      Alert.alert("Order Updated", `Order marked as ${nextStatus.replace(/_/g, " ")}`);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not update order status.");
    }
  };

  const handleCancelOrder = (orderId: string) => {
    Alert.alert("Cancel Order", "Are you sure you want to cancel / reject this order?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: () => handleUpdateOrderStatus(orderId, "CANCELLED" as OrderStatus),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Order & Pickup Verification</Text>
        <Text style={styles.headerSub}>Scan customer QR codes or verify 6-digit pickup PINs</Text>
      </View>

      {/* Mode Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "verify" && styles.tabActive]}
          onPress={() => setActiveTab("verify")}
          activeOpacity={0.8}
        >
          <QrCode
            size={16}
            color={activeTab === "verify" ? Colors.amberBright : Colors.textMuted}
          />
          <Text style={[styles.tabText, activeTab === "verify" && { color: Colors.amberBright }]}>
            QR & PIN Verification
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
            Delivery Orders ({orders.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "verify" ? (
        <View style={styles.verifyContainer}>
          {/* 1-Tap QR Camera Scanner CTA */}
          <TouchableOpacity
            style={styles.qrScanBanner}
            onPress={() => setQrScannerVisible(true)}
            activeOpacity={0.85}
          >
            <View style={styles.qrBannerLeft}>
              <View style={styles.qrIconWrap}>
                <Camera size={22} color={Colors.textInverse} />
              </View>
              <View>
                <Text style={styles.qrBannerTitle}>Scan Customer QR Code</Text>
                <Text style={styles.qrBannerSub}>Point camera at customer's phone to auto-verify</Text>
              </View>
            </View>
            <ArrowRight size={18} color={Colors.textInverse} />
          </TouchableOpacity>

          {/* PIN Input Box */}
          <View style={styles.pinInputCard}>
            <Text style={styles.pinCardTitle}>Or Enter 6-Digit Pickup PIN</Text>
            <Text style={styles.pinCardSub}>
              Type the code shown on the customer's ExpiryGo screen:
            </Text>

            <View style={styles.pinRow}>
              <TextInput
                style={styles.pinInput}
                placeholder="123456"
                placeholderTextColor={Colors.textMuted}
                value={pinCode}
                onChangeText={setPinCode}
                keyboardType="number-pad"
                maxLength={6}
              />
              <TouchableOpacity
                style={[styles.verifyBtn, verifying && { opacity: 0.7 }]}
                onPress={() => performVerification(pinCode)}
                disabled={verifying}
                activeOpacity={0.85}
              >
                {verifying ? (
                  <ActivityIndicator color={Colors.textInverse} />
                ) : (
                  <Text style={styles.verifyBtnText}>Verify</Text>
                )}
              </TouchableOpacity>
            </View>

            {verifyMessage && (
              <View
                style={[
                  styles.verifyMsgBox,
                  verifyMessage.success ? styles.verifyMsgSuccess : styles.verifyMsgError,
                ]}
              >
                {verifyMessage.success ? (
                  <CheckCircle2 size={18} color={Colors.primaryBright} />
                ) : null}
                <Text
                  style={[
                    styles.verifyMsgText,
                    verifyMessage.success ? { color: Colors.primaryBright } : { color: Colors.roseBright },
                  ]}
                >
                  {verifyMessage.text}
                </Text>
              </View>
            )}
          </View>

          {/* Pending Pickups Queue */}
          <Text style={styles.queueTitle}>Pending Store Pickups ({reservations.filter(r => r.status === "PENDING").length})</Text>
          <FlatList
            data={reservations.filter((r) => r.status === "PENDING")}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.pickupCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickupName}>{item.product?.name || "Deal Item"}</Text>
                  <Text style={styles.pickupQty}>
                    Qty: {item.quantity} • Total: ₹{item.total_price.toFixed(0)}
                  </Text>
                </View>
                <View style={styles.pinTag}>
                  <Text style={styles.pinTagLabel}>PIN:</Text>
                  <Text style={styles.pinTagCode}>{item.pickup_code}</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyQueueText}>No pending pickups in queue right now.</Text>
            }
          />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadData();
              }}
              tintColor={Colors.primaryBright}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderProduct}>{item.product?.name}</Text>
                  <Text style={styles.orderCustomer}>
                    {item.customer_name} ({item.customer_phone})
                  </Text>
                </View>
                <View style={styles.statusPill}>
                  <Text style={styles.statusText}>{item.status.replace("_", " ")}</Text>
                </View>
              </View>

              <View style={styles.addressRow}>
                <MapPin size={14} color={Colors.textMuted} />
                <Text style={styles.orderAddress}>{item.delivery_address}</Text>
              </View>

              {/* Status transition action buttons */}
              <View style={styles.statusActions}>
                {item.status === "PENDING" && (
                  <View style={{ flexDirection: "row", gap: Spacing.sm }}>
                    <TouchableOpacity
                      style={[styles.actionBtnPrimary, { flex: 1 }]}
                      onPress={() => handleUpdateOrderStatus(item.id, "ACCEPTED")}
                    >
                      <Text style={styles.actionBtnText}>Accept Order</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtnCancel, { width: 80 }]}
                      onPress={() => handleCancelOrder(item.id)}
                    >
                      <Text style={[styles.actionBtnText, { color: Colors.rose }]}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {item.status === "ACCEPTED" && (
                  <View style={{ flexDirection: "row", gap: Spacing.sm }}>
                    {item.order_type === "DELIVERY" ? (
                      <TouchableOpacity
                        style={[styles.actionBtnPrimary, { flex: 1 }]}
                        onPress={() => handleUpdateOrderStatus(item.id, "OUT_FOR_DELIVERY")}
                      >
                        <Text style={styles.actionBtnText}>Dispatch Delivery</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.actionBtnSuccess, { flex: 1 }]}
                        onPress={() => handleUpdateOrderStatus(item.id, "DELIVERED")}
                      >
                        <Text style={styles.actionBtnText}>Mark Collected</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.actionBtnCancel, { width: 80 }]}
                      onPress={() => handleCancelOrder(item.id)}
                    >
                      <Text style={[styles.actionBtnText, { color: Colors.rose }]}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {item.status === "OUT_FOR_DELIVERY" && (
                  <TouchableOpacity
                    style={styles.actionBtnSuccess}
                    onPress={() => handleUpdateOrderStatus(item.id, "DELIVERED")}
                  >
                    <Text style={styles.actionBtnText}>Mark Delivered</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon={<Truck size={36} color={Colors.textMuted} />}
              title="No delivery orders"
              description="Customer home delivery requests will appear here in real-time."
            />
          }
        />
      )}

      {/* Live Camera QR Scanner Modal */}
      <CameraScannerModal
        visible={qrScannerVisible}
        onClose={() => setQrScannerVisible(false)}
        mode="qr_pickup"
        onQrScanned={handleQrScanned}
      />
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
    fontSize: 20,
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
    backgroundColor: Colors.amberLight,
    borderColor: Colors.amberBright,
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
  verifyContainer: {
    paddingHorizontal: Spacing.md,
    flex: 1,
  },
  qrScanBanner: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  qrBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  qrIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(0,0,0,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  qrBannerTitle: {
    ...Typography.bodyBold,
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: "900",
  },
  qrBannerSub: {
    ...Typography.caption,
    color: "rgba(7, 10, 16, 0.8)",
    fontSize: 11,
    fontWeight: "600",
  },
  pinInputCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: Spacing.md,
  },
  pinCardTitle: {
    ...Typography.bodyBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  pinCardSub: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  pinRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  pinInput: {
    flex: 1,
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: Spacing.md,
    fontSize: 22,
    fontWeight: "900",
    color: Colors.primaryBright,
    letterSpacing: 6,
    textAlign: "center",
    height: 48,
  },
  verifyBtn: {
    backgroundColor: Colors.amberBright,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  verifyBtnText: {
    color: Colors.textInverse,
    fontWeight: "900",
    fontSize: 14,
  },
  verifyMsgBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: Radius.sm,
    marginTop: Spacing.md,
    gap: 8,
  },
  verifyMsgSuccess: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primaryGlow,
    borderWidth: 1,
  },
  verifyMsgError: {
    backgroundColor: Colors.roseLight,
    borderColor: "rgba(244, 63, 94, 0.4)",
    borderWidth: 1,
  },
  verifyMsgText: {
    ...Typography.caption,
    fontWeight: "700",
    flex: 1,
  },
  queueTitle: {
    ...Typography.title2,
    fontSize: 14,
    marginBottom: Spacing.sm,
  },
  pickupCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: Spacing.sm,
  },
  pickupName: {
    ...Typography.bodyBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  pickupQty: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  pinTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.primaryGlow,
  },
  pinTagLabel: {
    ...Typography.tag,
    color: Colors.textMuted,
    fontSize: 9,
  },
  pinTagCode: {
    ...Typography.bodyBold,
    color: Colors.primaryBright,
    letterSpacing: 2,
  },
  emptyQueueText: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: Spacing.md,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 90,
  },
  orderCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: Spacing.md,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  orderProduct: {
    ...Typography.bodyBold,
    fontSize: 15,
  },
  orderCustomer: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: Colors.blueLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  statusText: {
    ...Typography.tag,
    color: Colors.blueBright,
    fontSize: 9,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginVertical: Spacing.sm,
  },
  orderAddress: {
    ...Typography.caption,
    color: Colors.textMuted,
    flex: 1,
  },
  statusActions: {
    marginTop: Spacing.xs,
  },
  actionBtnPrimary: {
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    alignItems: "center",
  },
  actionBtnSuccess: {
    backgroundColor: Colors.amberBright,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    alignItems: "center",
  },
  actionBtnCancel: {
    backgroundColor: Colors.roseLight,
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.3)",
    paddingVertical: 8,
    borderRadius: Radius.sm,
    alignItems: "center",
  },
  actionBtnText: {
    color: Colors.textInverse,
    fontWeight: "800",
    fontSize: 13,
  },
});
