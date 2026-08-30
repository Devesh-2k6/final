import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import {
  Store,
  Users,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  MapPin,
  ArrowLeft,
  RefreshCw,
  Building2,
  AlertTriangle,
} from "lucide-react-native";
import { Colors, Radius, Spacing, Typography } from "../../theme";
import {
  getAllShops,
  getAdminStats,
  approveShop,
  rejectShop,
} from "../../services/admin";
import type { AdminShop, AdminStats } from "../../types";


interface AdminDashboardScreenProps {
  navigation: any;
}

export const AdminDashboardScreen: React.FC<AdminDashboardScreenProps> = ({ navigation }) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [shops, setShops] = useState<AdminShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">("PENDING");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [statsData, shopsData] = await Promise.all([
        getAdminStats().catch(() => null),
        getAllShops().catch(() => []),
      ]);
      if (statsData) setStats(statsData);
      setShops(shopsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleApprove = (shop: AdminShop) => {
    Alert.alert(
      "Approve Food Shop",
      `Are you sure you want to approve "${shop.name}" and activate live marketplace selling?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve & Activate",
          style: "default",
          onPress: async () => {
            setActionLoading(shop.id);
            try {
              await approveShop(shop.id);
              Alert.alert("Success", `"${shop.name}" has been approved!`);
              loadData();
            } catch (err: any) {
              Alert.alert("Approval Failed", err?.message || "Could not approve shop.");
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleReject = (shop: AdminShop) => {
    Alert.prompt
      ? Alert.prompt(
          "Reject Shop Application",
          `Enter rejection reason for "${shop.name}":`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Confirm Rejection",
              style: "destructive",
              onPress: async (reason?: string) => {
                if (!reason || reason.trim().length < 3) {
                  Alert.alert("Error", "Please provide a valid rejection reason.");
                  return;
                }
                setActionLoading(shop.id);
                try {
                  await rejectShop(shop.id, reason.trim());
                  Alert.alert("Rejected", `"${shop.name}" application rejected.`);
                  loadData();
                } catch (err: any) {
                  Alert.alert("Error", err?.message || "Failed to reject shop.");
                } finally {
                  setActionLoading(null);
                }
              },
            },
          ],
          "plain-text",
          "Business could not be verified as a legitimate food seller."
        )
      : Alert.alert(
          "Reject Shop Application",
          `Reject "${shop.name}" application?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Reject Application",
              style: "destructive",
              onPress: async () => {
                setActionLoading(shop.id);
                try {
                  await rejectShop(shop.id, "Business could not be verified as a food seller.");
                  Alert.alert("Rejected", `"${shop.name}" application rejected.`);
                  loadData();
                } catch (err: any) {
                  Alert.alert("Error", err?.message || "Failed to reject shop.");
                } finally {
                  setActionLoading(null);
                }
              },
            },
          ]
        );
  };

  const filteredShops = shops.filter((shop) => {
    const matchesTab = activeTab === "ALL" ? true : shop.approval_status === activeTab;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      shop.name.toLowerCase().includes(q) ||
      (shop.owner_email && shop.owner_email.toLowerCase().includes(q)) ||
      (shop.address && shop.address.toLowerCase().includes(q));
    return matchesTab && matchesSearch;
  });

  const pendingCount = shops.filter((s) => s.approval_status === "PENDING").length;
  const approvedCount = shops.filter((s) => s.approval_status === "APPROVED").length;

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Trust & Moderation</Text>
          <Text style={styles.headerSub}>Merchant Food-Shop Approvals</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadData}>
          <RefreshCw size={18} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        {/* Analytics Summary */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderColor: "#fef3c7" }]}>
            <View style={[styles.statIcon, { backgroundColor: "rgba(245, 158, 11, 0.15)" }]}>
              <Clock size={16} color="#d97706" />
            </View>
            <Text style={styles.statValue}>{stats?.pending_shops ?? pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>

          <View style={[styles.statCard, { borderColor: "#d1fae5" }]}>
            <View style={[styles.statIcon, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
              <Store size={16} color="#059669" />
            </View>
            <Text style={styles.statValue}>{stats?.active_shops ?? approvedCount}</Text>
            <Text style={styles.statLabel}>Active Stores</Text>
          </View>

          <View style={[styles.statCard, { borderColor: "#e0e7ff" }]}>
            <View style={[styles.statIcon, { backgroundColor: "rgba(99, 102, 241, 0.15)" }]}>
              <Users size={16} color="#4f46e5" />
            </View>
            <Text style={styles.statValue}>{stats?.total_users ?? 0}</Text>
            <Text style={styles.statLabel}>Users</Text>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "PENDING" && styles.tabButtonActiveAmber]}
            onPress={() => setActiveTab("PENDING")}
          >
            <Text style={[styles.tabText, activeTab === "PENDING" && styles.tabTextActive]}>
              Pending ({pendingCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === "APPROVED" && styles.tabButtonActiveEmerald]}
            onPress={() => setActiveTab("APPROVED")}
          >
            <Text style={[styles.tabText, activeTab === "APPROVED" && styles.tabTextActive]}>
              Approved ({approvedCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === "ALL" && styles.tabButtonActiveDark]}
            onPress={() => setActiveTab("ALL")}
          >
            <Text style={[styles.tabText, activeTab === "ALL" && styles.tabTextActive]}>
              All ({shops.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Search size={16} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search shop, owner email..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Shop List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading verification queue...</Text>
          </View>
        ) : filteredShops.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Store size={36} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No shops in this queue</Text>
            <Text style={styles.emptySubtitle}>All submitted stores have been reviewed.</Text>
          </View>
        ) : (
          filteredShops.map((shop) => {
            const isPending = shop.approval_status === "PENDING";
            const isApproved = shop.approval_status === "APPROVED";
            const isRejected = shop.approval_status === "REJECTED";
            const isActionBusy = actionLoading === shop.id;

            return (
              <View key={shop.id} style={styles.shopCard}>
                <View style={styles.shopCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shopName}>{shop.name}</Text>
                    <Text style={styles.shopOwner}>
                      Owner: {shop.owner_name || "Merchant"} ({shop.owner_email})
                    </Text>
                  </View>

                  {isPending && (
                    <View style={styles.statusBadgeAmber}>
                      <Clock size={10} color="#92400e" />
                      <Text style={styles.statusTextAmber}>Pending</Text>
                    </View>
                  )}
                  {isApproved && (
                    <View style={styles.statusBadgeEmerald}>
                      <CheckCircle2 size={10} color="#065f46" />
                      <Text style={styles.statusTextEmerald}>Active</Text>
                    </View>
                  )}
                  {isRejected && (
                    <View style={styles.statusBadgeRed}>
                      <XCircle size={10} color="#991b1b" />
                      <Text style={styles.statusTextRed}>Rejected</Text>
                    </View>
                  )}
                </View>

                {/* Location Verification Pill */}
                <View style={styles.verificationBox}>
                  <Building2 size={14} color={Colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.verificationTitle}>
                      OSM Match: {shop.location_verification_name || shop.name} ({shop.location_verification_category || "Food"})
                    </Text>
                    <Text style={styles.verificationAddress} numberOfLines={1}>
                      {shop.address}
                    </Text>
                  </View>
                </View>

                {shop.approval_reason && (
                  <View style={styles.rejectionReasonBox}>
                    <Text style={styles.rejectionReasonText}>
                      Note: {shop.approval_reason}
                    </Text>
                  </View>
                )}

                {/* Actions */}
                {isPending && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      disabled={isActionBusy}
                      onPress={() => handleApprove(shop)}
                    >
                      {isActionBusy ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <>
                          <CheckCircle2 size={14} color="#ffffff" />
                          <Text style={styles.approveBtnText}>Approve</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.rejectBtn}
                      disabled={isActionBusy}
                      onPress={() => handleReject(shop)}
                    >
                      <XCircle size={14} color="#dc2626" />
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    gap: Spacing.md,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    ...Typography.title2,
    color: Colors.textPrimary,
    fontWeight: "800",
  },
  headerSub: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: "center",
  },

  statIcon: {
    width: 30,
    height: 30,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  statValue: {
    ...Typography.title1,
    fontWeight: "900",
    color: Colors.textPrimary,
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: "700",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    borderRadius: Radius.md,
  },
  tabButtonActiveAmber: {
    backgroundColor: "#f59e0b",
  },
  tabButtonActiveEmerald: {
    backgroundColor: Colors.primary,
  },
  tabButtonActiveDark: {
    backgroundColor: Colors.textPrimary,
  },
  tabText: {
    ...Typography.caption,
    fontWeight: "800",
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: "#ffffff",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 40,
    ...Typography.body,
    color: Colors.textPrimary,
  },
  loadingContainer: {
    padding: Spacing.xxl,
    alignItems: "center",
    gap: Spacing.sm,
  },
  loadingText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  emptyContainer: {
    padding: Spacing.xxl,
    alignItems: "center",
    gap: Spacing.xs,
  },
  emptyTitle: {
    ...Typography.title2,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  shopCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: Spacing.sm,
  },
  shopCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  shopName: {
    ...Typography.title2,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  shopOwner: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  statusBadgeAmber: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radius.full,
    gap: 3,
  },
  statusTextAmber: {
    fontSize: 10,
    fontWeight: "800",
    color: "#92400e",
  },
  statusBadgeEmerald: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d1fae5",
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radius.full,
    gap: 3,
  },
  statusTextEmerald: {
    fontSize: 10,
    fontWeight: "800",
    color: "#065f46",
  },
  statusBadgeRed: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fee2e2",
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radius.full,
    gap: 3,
  },
  statusTextRed: {
    fontSize: 10,
    fontWeight: "800",
    color: "#991b1b",
  },
  verificationBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    padding: Spacing.sm,
    borderRadius: Radius.md,
    gap: Spacing.sm,
  },
  verificationTitle: {
    ...Typography.caption,
    fontWeight: "800",
    color: Colors.primary,
  },
  verificationAddress: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 11,
  },
  rejectionReasonBox: {
    backgroundColor: "#fef2f2",
    padding: Spacing.xs,
    borderRadius: Radius.sm,
  },
  rejectionReasonText: {
    ...Typography.caption,
    color: "#b91c1c",
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  approveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    gap: Spacing.xs,
  },
  approveBtnText: {
    ...Typography.caption,
    fontWeight: "800",
    color: "#ffffff",
  },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fee2e2",
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    gap: Spacing.xs,
  },
  rejectBtnText: {
    ...Typography.caption,
    fontWeight: "800",
    color: "#dc2626",
  },
});

