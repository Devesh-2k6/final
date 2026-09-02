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
  Platform,
  StatusBar,
  Image,
  Modal,
  Linking,
} from "react-native";
import {
  Store,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  MapPin,
  ArrowLeft,
  RefreshCw,
  Building2,
  AlertTriangle,
  LogOut,
  Tag,
  FileText,
  ExternalLink,
  ShieldCheck,
  Compass,
  X,
  Eye,
} from "lucide-react-native";
import { Colors, Radius, Spacing, Typography } from "../../theme";
import { useAuth } from "../../contexts/AuthContext";
import {
  getAllShops,
  getAdminStats,
  approveShop,
  rejectShop,
  reverifyShopLocation,
  suspendShop,
  reactivateShop,
} from "../../services/admin";
import { getApiBaseUrl } from "../../config/env";
import { MobileAdminLocationMap } from "../../components/MobileAdminLocationMap";
import type { AdminShop, AdminStats } from "../../types";

interface AdminDashboardScreenProps {
  navigation: any;
}

export const AdminDashboardScreen: React.FC<AdminDashboardScreenProps> = ({ navigation }) => {
  const { logout } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [shops, setShops] = useState<AdminShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">("PENDING");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [apiBase, setApiBase] = useState("http://10.60.86.184:8000");

  // Image Preview Modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Location Override Modal
  const [overrideModalShop, setOverrideModalShop] = useState<AdminShop | null>(null);
  const [overrideReason, setOverrideReason] = useState("Store visited and physically verified by administrator.");
  const [overrideNotes, setOverrideNotes] = useState("Fast-tracked through location verification manual override.");

  useEffect(() => {
    getApiBaseUrl().then((url) => {
      if (url) setApiBase(url);
    });
  }, []);

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

  const getMediaUrl = (urlOrPath?: string | null) => {
    if (!urlOrPath) return "";
    if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://") || urlOrPath.startsWith("file://")) {
      return urlOrPath;
    }
    const path = urlOrPath.startsWith("/") ? urlOrPath : `/${urlOrPath}`;
    return `${apiBase}${path}`;
  };

  const handleApprove = (shop: AdminShop) => {
    // If location is unverified or outside radius, open location override modal
    if (!shop.location_verified) {
      setOverrideModalShop(shop);
      setOverrideReason("Store visited and physically verified by administrator.");
      setOverrideNotes("Fast-tracked through location verification manual override.");
      return;
    }

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

  const handleConfirmOverride = async () => {
    if (!overrideModalShop) return;
    if (!overrideReason.trim() || overrideReason.trim().length < 3) {
      Alert.alert("Validation Error", "Please provide a valid override reason (min 3 characters).");
      return;
    }

    setActionLoading(overrideModalShop.id);
    try {
      await approveShop(overrideModalShop.id, overrideNotes.trim(), true, overrideReason.trim());
      Alert.alert("Approved", `"${overrideModalShop.name}" approved with location override!`);
      setOverrideModalShop(null);
      loadData();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to approve shop.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReverify = async (shop: AdminShop) => {
    setActionLoading(shop.id);
    try {
      const res = await reverifyShopLocation(shop.id);
      Alert.alert(
        res.location_verified ? "Location Verified ✓" : "Verification Inconclusive",
        res.location_verified
          ? `Matched with: ${res.location_verification_name || res.name}`
          : "Nearby OSM business match was outside the 100m radius."
      );
      loadData();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to re-verify location.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = (shop: AdminShop) => {
    Alert.alert(
      "Reject Shop Application",
      `Are you sure you want to reject "${shop.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm Rejection",
          style: "destructive",
          onPress: async () => {
            setActionLoading(shop.id);
            try {
              await rejectShop(shop.id, "Business could not be verified as a legitimate food seller.");
              Alert.alert("Rejected", `"${shop.name}" application has been rejected.`);
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

  const handleSuspend = (shop: AdminShop) => {
    Alert.alert("Suspend Store", `Suspend "${shop.name}" from live selling?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Suspend Store",
        style: "destructive",
        onPress: async () => {
          setActionLoading(shop.id);
          try {
            await suspendShop(shop.id, "Temporarily suspended by administrator.");
            loadData();
          } catch (err: any) {
            Alert.alert("Error", err?.message || "Failed to suspend shop.");
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  const handleReactivate = (shop: AdminShop) => {
    Alert.alert("Reactivate Store", `Re-activate "${shop.name}" for live marketplace deals?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Re-activate",
        onPress: async () => {
          setActionLoading(shop.id);
          try {
            await reactivateShop(shop.id);
            loadData();
          } catch (err: any) {
            Alert.alert("Error", err?.message || "Failed to reactivate shop.");
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
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
  const rejectedCount = shops.filter((s) => s.approval_status === "REJECTED").length;

  const handleBack = () => {
    if (navigation && typeof navigation.canGoBack === "function" && navigation.canGoBack()) {
      navigation.goBack();
    } else {
      Alert.alert("Admin Console", "Do you want to log out of the Admin Console?", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: () => logout() },
      ]);
    }
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to log out of the Admin Console?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => logout() },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Top Header with Notch Safe Area */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Trust & Moderation</Text>
          <Text style={styles.headerSub}>Merchant Food-Shop Approvals</Text>
        </View>
        <TouchableOpacity style={styles.actionIconBtn} onPress={loadData}>
          <RefreshCw size={17} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionIconBtn, { backgroundColor: "rgba(244, 63, 94, 0.12)" }]} onPress={handleLogout}>
          <LogOut size={17} color={Colors.roseBright} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        {/* Analytics 4-Card Summary */}
        <View style={styles.statsGrid}>
          {/* 1. Pending */}
          <View style={[styles.statCard, { borderColor: "#fef3c7" }]}>
            <View style={[styles.statIcon, { backgroundColor: "rgba(245, 158, 11, 0.15)" }]}>
              <Clock size={16} color="#d97706" />
            </View>
            <Text style={styles.statValue}>{stats?.pending_shops ?? pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>

          {/* 2. Active Food Stores */}
          <View style={[styles.statCard, { borderColor: "#d1fae5" }]}>
            <View style={[styles.statIcon, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
              <Store size={16} color="#059669" />
            </View>
            <Text style={styles.statValue}>{stats?.active_shops ?? approvedCount}</Text>
            <Text style={styles.statLabel}>Active Stores</Text>
          </View>

          {/* 3. Registered Accounts */}
          <View style={[styles.statCard, { borderColor: "#e0e7ff" }]}>
            <View style={[styles.statIcon, { backgroundColor: "rgba(99, 102, 241, 0.15)" }]}>
              <Users size={16} color="#4f46e5" />
            </View>
            <Text style={styles.statValue}>{stats?.total_users ?? 0}</Text>
            <Text style={styles.statLabel}>Accounts</Text>
          </View>

          {/* 4. Live Surplus Deals */}
          <View style={[styles.statCard, { borderColor: "#fee2e2" }]}>
            <View style={[styles.statIcon, { backgroundColor: "rgba(239, 68, 68, 0.15)" }]}>
              <Tag size={16} color="#dc2626" />
            </View>
            <Text style={styles.statValue}>{stats?.total_products ?? 10}</Text>
            <Text style={styles.statLabel}>Live Deals</Text>
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

        {/* Search Box */}
        <View style={styles.searchBox}>
          <Search size={16} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search shop, owner email, location..."
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
            const isSuspended = shop.approval_status === "SUSPENDED";
            const isActionBusy = actionLoading === shop.id;

            const photoFullUrl = getMediaUrl(shop.photo_url);
            const docFullUrl = getMediaUrl(shop.document_url || shop.verification_document_url);

            return (
              <View key={shop.id} style={styles.shopCard}>
                {/* Shop Card Header */}
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
                      <Text style={styles.statusTextEmerald}>Approved & Active</Text>
                    </View>
                  )}
                  {isRejected && (
                    <View style={styles.statusBadgeRed}>
                      <XCircle size={10} color="#991b1b" />
                      <Text style={styles.statusTextRed}>Rejected</Text>
                    </View>
                  )}
                  {isSuspended && (
                    <View style={styles.statusBadgeAmber}>
                      <AlertTriangle size={10} color="#92400e" />
                      <Text style={styles.statusTextAmber}>Suspended</Text>
                    </View>
                  )}
                </View>

                {/* 1. Interactive Visual OpenStreetMap Leaflet Map */}
                <MobileAdminLocationMap
                  submittedLat={shop.latitude}
                  submittedLng={shop.longitude}
                  submittedName={shop.name}
                  submittedAddress={shop.address}
                  matchedLat={shop.latitude}
                  matchedLng={shop.longitude}
                  matchedName={shop.location_verification_name}
                  matchedAddress={shop.location_verification_address}
                  distanceMeters={shop.location_verification_distance_meters}
                  category={shop.location_verification_category}
                  isVerified={shop.location_verified}
                  height={170}
                />

                {/* 2. Location & Verification Metadata Cards */}
                <View style={styles.metadataGrid}>
                  {/* Submitted Store Address */}
                  <View style={styles.metaSubBox}>
                    <View style={styles.metaBoxHeader}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <MapPin size={11} color="#3b82f6" />
                        <Text style={styles.metaBoxTitle}>SUBMITTED LOCATION</Text>
                      </View>
                      <Text style={styles.metaGpsCoords}>
                        {shop.latitude?.toFixed(4)}, {shop.longitude?.toFixed(4)}
                      </Text>
                    </View>
                    <Text style={styles.metaStoreTitle}>{shop.name}</Text>
                    <Text style={styles.metaAddressText}>{shop.address}</Text>
                  </View>

                  {/* OpenStreetMap Food Match */}
                  <View style={[styles.metaMatchBox, { borderColor: shop.location_verified ? "#a7f3d0" : "#fde68a" }]}>
                    <View style={styles.metaBoxHeader}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Building2 size={11} color={shop.location_verified ? "#059669" : "#d97706"} />
                        <Text style={[styles.metaBoxTitle, { color: shop.location_verified ? "#065f46" : "#92400e" }]}>
                          OSM FOOD MATCH
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.reverifyBtn}
                        onPress={() => handleReverify(shop)}
                        disabled={isActionBusy}
                      >
                        <RefreshCw size={9} color={Colors.primary} />
                        <Text style={styles.reverifyBtnText}>Re-check</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.metaStoreTitle}>
                      {shop.location_verification_name || (shop.location_verified ? shop.name : "No Verified OSM Match")}
                    </Text>
                    <Text style={styles.metaAddressText} numberOfLines={1}>
                      {shop.location_verification_address || shop.address}
                    </Text>

                    <View style={styles.metaDistanceRow}>
                      <Text style={[styles.metaDistanceText, { color: shop.location_verified ? "#059669" : "#d97706" }]}>
                        Distance: {shop.location_verification_distance_meters != null ? `${shop.location_verification_distance_meters}m` : (shop.location_verified ? "< 100m" : "N/A")}
                      </Text>
                      <Text style={styles.metaCategoryText}>
                        Category: {shop.location_verification_category || "Food / Grocery"}
                      </Text>
                    </View>

                    {shop.location_override_by && (
                      <View style={styles.overrideAuditBox}>
                        <Text style={styles.overrideAuditTitle}>🛡️ Location Overridden by Admin</Text>
                        <Text style={styles.overrideAuditReason}>Reason: "{shop.location_override_reason}"</Text>
                        <Text style={styles.overrideAuditBy}>By: {shop.location_override_by}</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* 3. Storefront Photo & Business License Preview */}
                <View style={styles.photoDocContainer}>
                  <Text style={styles.photoDocHeaderTitle}>VENDOR STORE PHOTO & BUSINESS LICENSE</Text>

                  <View style={styles.photoDocRow}>
                    {/* Storefront Photo */}
                    <View style={styles.photoDocCard}>
                      <Text style={styles.photoDocSubLabel}>📸 STOREFRONT PHOTO</Text>
                      {photoFullUrl ? (
                        <TouchableOpacity
                          style={styles.imageThumbContainer}
                          onPress={() => setPreviewImage(photoFullUrl)}
                          activeOpacity={0.8}
                        >
                          <Image source={{ uri: photoFullUrl }} style={styles.storeThumbImg} />
                          <View style={styles.zoomOverlay}>
                            <Eye size={12} color="#ffffff" />
                            <Text style={styles.zoomText}>View Photo</Text>
                          </View>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.emptyDocBox}>
                          <Text style={styles.emptyDocText}>No storefront photo</Text>
                        </View>
                      )}
                    </View>

                    {/* Business Document */}
                    <View style={styles.photoDocCard}>
                      <Text style={styles.photoDocSubLabel}>📄 BUSINESS LICENSE / FSSAI</Text>
                      {docFullUrl ? (
                        <View style={styles.docInspectBox}>
                          <Text style={styles.docFileName} numberOfLines={1}>
                            📎 {shop.verification_document_name || "Business Document"}
                          </Text>
                          <TouchableOpacity
                            style={styles.inspectDocBtn}
                            onPress={() => {
                              if (docFullUrl.match(/\.(jpg|jpeg|png|webp)$/i)) {
                                setPreviewImage(docFullUrl);
                              } else {
                                Linking.openURL(docFullUrl).catch(() => {});
                              }
                            }}
                            activeOpacity={0.8}
                          >
                            <FileText size={11} color="#6b21a8" />
                            <Text style={styles.inspectDocText}>Inspect Document</Text>
                            <ExternalLink size={10} color="#6b21a8" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={styles.emptyDocBox}>
                          <Text style={styles.emptyDocText}>No license document</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* 4. Action Buttons */}
                <View style={styles.actionRow}>
                  {isPending && (
                    <>
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
                    </>
                  )}

                  {isApproved && (
                    <TouchableOpacity
                      style={styles.suspendBtn}
                      disabled={isActionBusy}
                      onPress={() => handleSuspend(shop)}
                    >
                      <AlertTriangle size={13} color="#92400e" />
                      <Text style={styles.suspendBtnText}>Suspend</Text>
                    </TouchableOpacity>
                  )}

                  {(isRejected || isSuspended) && (
                    <TouchableOpacity
                      style={styles.reactivateBtn}
                      disabled={isActionBusy}
                      onPress={() => handleReactivate(shop)}
                    >
                      <CheckCircle2 size={13} color="#065f46" />
                      <Text style={styles.reactivateBtnText}>Re-approve</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Full-Screen Image Preview Modal */}
      <Modal visible={!!previewImage} transparent={true} animationType="fade" onRequestClose={() => setPreviewImage(null)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setPreviewImage(null)}>
            <X size={22} color="#ffffff" />
          </TouchableOpacity>
          {previewImage && (
            <Image source={{ uri: previewImage }} style={styles.modalFullImage} resizeMode="contain" />
          )}
        </View>
      </Modal>

      {/* Location Override Approval Modal */}
      <Modal visible={!!overrideModalShop} transparent={true} animationType="slide" onRequestClose={() => setOverrideModalShop(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.overrideModalCard}>
            <View style={styles.overrideModalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <ShieldCheck size={18} color="#d97706" />
                <Text style={styles.overrideModalTitle}>Manual Location Override</Text>
              </View>
              <TouchableOpacity onPress={() => setOverrideModalShop(null)}>
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.overrideModalSubtitle}>
              "{overrideModalShop?.name}" was outside the automatic 100m GPS radius. Provide an audit reason to approve:
            </Text>

            <Text style={styles.overrideInputLabel}>OVERRIDE REASON (MANDATORY AUDIT TRAIL)</Text>
            <TextInput
              style={styles.overrideTextInput}
              value={overrideReason}
              onChangeText={setOverrideReason}
              placeholder="e.g. Store visited and physically verified by admin"
              placeholderTextColor={Colors.textMuted}
              multiline
            />

            <View style={styles.overrideModalActions}>
              <TouchableOpacity style={styles.overrideCancelBtn} onPress={() => setOverrideModalShop(null)}>
                <Text style={styles.overrideCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.overrideConfirmBtn}
                onPress={handleConfirmOverride}
                disabled={actionLoading === overrideModalShop?.id}
              >
                {actionLoading === overrideModalShop?.id ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.overrideConfirmText}>Approve with Override</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 24) + 12 : 54,
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
  actionIconBtn: {
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
    fontWeight: "900",
  },
  headerSub: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  scrollContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 6,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: "center",
  },
  statIcon: {
    width: 26,
    height: 26,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 9,
    color: Colors.textSecondary,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    borderRadius: Radius.sm,
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
    fontSize: 11,
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
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 38,
    fontSize: 12,
    color: Colors.textPrimary,
  },
  loadingContainer: {
    padding: Spacing.xxl,
    alignItems: "center",
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: 12,
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
    fontSize: 12,
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
    fontSize: 17,
    fontWeight: "900",
    color: Colors.textPrimary,
  },
  shopOwner: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadgeAmber: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 3,
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
    paddingHorizontal: 8,
    paddingVertical: 3,
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    gap: 3,
  },
  statusTextRed: {
    fontSize: 10,
    fontWeight: "800",
    color: "#991b1b",
  },
  metadataGrid: {
    gap: 6,
    marginTop: 4,
  },
  metaSubBox: {
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 3,
  },
  metaMatchBox: {
    backgroundColor: "#f0fdf4",
    padding: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: 3,
  },
  metaBoxHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaBoxTitle: {
    fontSize: 9,
    fontWeight: "800",
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  metaGpsCoords: {
    fontSize: 9,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: "#3b82f6",
    fontWeight: "700",
  },
  reverifyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#ffffff",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  reverifyBtnText: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.primary,
  },
  metaStoreTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  metaAddressText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  metaDistanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 3,
    paddingTop: 3,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  metaDistanceText: {
    fontSize: 10,
    fontWeight: "700",
  },
  metaCategoryText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  overrideAuditBox: {
    marginTop: 4,
    padding: 6,
    borderRadius: Radius.xs,
    backgroundColor: "rgba(147, 51, 234, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(147, 51, 234, 0.2)",
    gap: 1,
  },
  overrideAuditTitle: {
    fontSize: 9,
    fontWeight: "800",
    color: "#7e22ce",
  },
  overrideAuditReason: {
    fontSize: 10,
    color: "#6b21a8",
    fontWeight: "600",
  },
  overrideAuditBy: {
    fontSize: 8,
    color: "#9333ea",
  },
  photoDocContainer: {
    backgroundColor: "rgba(147, 51, 234, 0.04)",
    padding: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "rgba(147, 51, 234, 0.15)",
    gap: 6,
    marginTop: 2,
  },
  photoDocHeaderTitle: {
    fontSize: 9,
    fontWeight: "800",
    color: "#7e22ce",
    letterSpacing: 0.6,
  },
  photoDocRow: {
    flexDirection: "row",
    gap: 8,
  },
  photoDocCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 4,
  },
  photoDocSubLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  imageThumbContainer: {
    position: "relative",
    width: "100%",
    height: 70,
    borderRadius: Radius.xs,
    overflow: "hidden",
  },
  storeThumbImg: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  zoomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  zoomText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#ffffff",
  },
  docInspectBox: {
    height: 70,
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  docFileName: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  inspectDocBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#f3e8ff",
    paddingVertical: 4,
    borderRadius: Radius.xs,
  },
  inspectDocText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#6b21a8",
  },
  emptyDocBox: {
    height: 70,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    borderRadius: Radius.xs,
  },
  emptyDocText: {
    fontSize: 9,
    color: Colors.textMuted,
    fontStyle: "italic",
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingTop: 4,
  },
  approveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 9,
    borderRadius: Radius.md,
    gap: 4,
  },
  approveBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#ffffff",
  },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fee2e2",
    paddingVertical: 9,
    borderRadius: Radius.md,
    gap: 4,
  },
  rejectBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#dc2626",
  },
  suspendBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef3c7",
    paddingVertical: 8,
    borderRadius: Radius.md,
    gap: 4,
  },
  suspendBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#92400e",
  },
  reactivateBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#d1fae5",
    paddingVertical: 8,
    borderRadius: Radius.md,
    gap: 4,
  },
  reactivateBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#065f46",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
  },
  modalCloseBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 8,
    borderRadius: Radius.full,
  },
  modalFullImage: {
    width: "100%",
    height: "80%",
  },
  overrideModalCard: {
    width: "100%",
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  overrideModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  overrideModalTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: Colors.textPrimary,
  },
  overrideModalSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  overrideInputLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: Colors.textMuted,
    letterSpacing: 0.6,
    marginTop: 4,
  },
  overrideTextInput: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 10,
    fontSize: 12,
    color: Colors.textPrimary,
    minHeight: 60,
    textAlignVertical: "top",
  },
  overrideModalActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  overrideCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  overrideCancelText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  overrideConfirmBtn: {
    flex: 2,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  overrideConfirmText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#ffffff",
  },
});
