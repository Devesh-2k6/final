import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import {
  User,
  Leaf,
  DollarSign,
  Package,
  Store,
  Settings,
  LogOut,
  Sparkles,
  Server,
  Heart,
  ChevronRight,
  ShieldCheck,
  Zap,
  Mail,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
} from "lucide-react-native";
import { Colors, Radius, Spacing, Typography, Shadows } from "../../theme";
import { useAuth } from "../../contexts/AuthContext";
import { getApiBaseUrl, setApiBaseUrl, resetApiBaseUrl } from "../../config/env";
import { getFavorites } from "../../services/products";
import { instantVerifyEmail, resendVerification } from "../../services/auth";
import type { ApiFavorite } from "../../types";

interface ProfileScreenProps {
  navigation: any;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { user, logout, roleIntent, setRoleIntent, refreshUser } = useAuth();
  const [apiUrl, setApiUrl] = useState("");
  const [favorites, setFavorites] = useState<ApiFavorite[]>([]);
  const [editingApi, setEditingApi] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);


  useEffect(() => {
    async function load() {
      const url = await getApiBaseUrl();
      setApiUrl(url);
      try {
        const favs = await getFavorites();
        setFavorites(favs);
      } catch {}
      refreshUser();
    }
    load();
  }, [refreshUser]);

  const handleSaveApiUrl = async () => {
    if (apiUrl.trim()) {
      await setApiBaseUrl(apiUrl.trim());
      Alert.alert("API URL Updated", "Backend server address has been saved.");
      setEditingApi(false);
    }
  };

  const handleResetApiUrl = async () => {
    await resetApiBaseUrl();
    const url = await getApiBaseUrl();
    setApiUrl(url);
    Alert.alert("API Reset", "Reset to default platform URL.");
    setEditingApi(false);
  };

  const handleInstantVerifyEmail = async () => {
    if (!user?.email || verifyingEmail) return;
    setVerifyingEmail(true);
    setEmailMsg(null);
    try {
      const res = await instantVerifyEmail(user.email);
      Alert.alert("Email Verified", "⚡ Your email has been verified successfully! Deal reservations and merchant tools are now active.");
      setEmailMsg(res.message || "Email verified!");
      await refreshUser();
    } catch (err: any) {
      Alert.alert("Verification Error", err.message || "Failed to verify email.");
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleResendVerificationEmail = async () => {
    if (!user?.email || resendingEmail) return;
    setResendingEmail(true);
    setEmailMsg(null);
    try {
      const res = await resendVerification(user.email);
      Alert.alert("Verification Sent", res.message || "A fresh verification link has been dispatched to your email address.");
      setEmailMsg("Fresh verification link sent!");
    } catch (err: any) {
      Alert.alert("Resend Error", err.message || "Failed to resend verification link.");
    } finally {
      setResendingEmail(false);
    }
  };

  const handleSwitchToShop = () => {
    setRoleIntent("shop");
  };

  const isVerified = user?.email_verified === true;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* User Header Card */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <User size={30} color={Colors.primaryBright} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{user?.name || "Food Rescuer"}</Text>
          <Text style={styles.userEmail}>{user?.email || ""}</Text>
          <View style={[styles.badgePill, !isVerified && { backgroundColor: "rgba(245, 158, 11, 0.15)" }]}>
            <Zap size={11} color={isVerified ? Colors.primaryBright : Colors.amberBright} fill={isVerified ? Colors.primaryBright : Colors.amberBright} />
            <Text style={[styles.badgeText, !isVerified && { color: Colors.amberBright }]}>
              {isVerified ? "Verified Account" : "Unverified Email"}
            </Text>
          </View>
        </View>
      </View>

      {/* Email Verification Action Card (when unverified) */}
      {!isVerified && (
        <View style={styles.verifyCard}>
          <View style={styles.verifyCardHeader}>
            <Mail size={20} color={Colors.amberBright} />
            <View style={{ flex: 1 }}>
              <Text style={styles.verifyCardTitle}>Verify Your Email Address</Text>
              <Text style={styles.verifyCardSub}>
                Activate your account to make deal reservations & publish listings.
              </Text>
            </View>
          </View>

          {emailMsg && (
            <Text style={styles.verifyMsgText}>{emailMsg}</Text>
          )}

          <View style={styles.verifyBtnRow}>
            <TouchableOpacity
              style={styles.instantVerifyBtn}
              onPress={handleInstantVerifyEmail}
              disabled={verifyingEmail}
              activeOpacity={0.85}
            >
              <Zap size={14} color="#FFF" />
              <Text style={styles.instantVerifyText}>
                {verifyingEmail ? "Verifying..." : "⚡ 1-Click Verify"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendVerifyBtn}
              onPress={handleResendVerificationEmail}
              disabled={resendingEmail}
              activeOpacity={0.85}
            >
              <RefreshCw size={13} color={Colors.textSecondary} />
              <Text style={styles.resendVerifyText}>
                {resendingEmail ? "Sending..." : "Resend Link"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}


      {/* Environmental Impact Hero Dashboard */}
      <View style={styles.impactCard}>
        <View style={styles.impactHeader}>
          <Leaf size={18} color={Colors.primaryBright} />
          <Text style={styles.impactTitle}>Lifetime Environmental Impact</Text>
        </View>

        <View style={styles.impactGrid}>
          <View style={styles.impactBox}>
            <Text style={styles.impactVal}>
              ₹{(user?.total_money_saved ?? 0).toFixed(0)}
            </Text>
            <Text style={styles.impactLabel}>Money Saved</Text>
          </View>

          <View style={styles.impactBox}>
            <Text style={[styles.impactVal, { color: Colors.amberBright }]}>
              {user?.total_items_saved ?? 0}
            </Text>
            <Text style={styles.impactLabel}>Meals Saved</Text>
          </View>

          <View style={styles.impactBox}>
            <Text style={[styles.impactVal, { color: Colors.blueBright }]}>
              {(user?.co2_saved_kg ?? 0).toFixed(1)} kg
            </Text>
            <Text style={styles.impactLabel}>CO₂ Prevented</Text>
          </View>
        </View>
      </View>

      {/* Switch to Shopkeeper Mode Action (only for registered store owners) */}
      {user?.is_shop_owner && (
        <TouchableOpacity style={styles.shopSwitchCard} onPress={handleSwitchToShop} activeOpacity={0.85}>
          <View style={styles.shopSwitchLeft}>
            <Store size={22} color={Colors.amberBright} />
            <View>
              <Text style={styles.shopSwitchTitle}>Switch to Store Owner Mode</Text>
              <Text style={styles.shopSwitchSub}>Manage your store, publish deals & stop waste</Text>
            </View>
          </View>
          <ChevronRight size={18} color={Colors.amberBright} />
        </TouchableOpacity>
      )}

      {/* Admin Moderation Queue Button */}
      <TouchableOpacity
        style={styles.adminSwitchCard}
        onPress={() => navigation.navigate("AdminDashboard")}
        activeOpacity={0.85}
      >
        <View style={styles.shopSwitchLeft}>
          <ShieldCheck size={20} color={Colors.blueBright} />
          <View>
            <Text style={[styles.shopSwitchTitle, { color: Colors.blueBright }]}>Platform Moderation Center</Text>
            <Text style={styles.shopSwitchSub}>Review reported items, sellers & platform metrics</Text>
          </View>
        </View>
        <ChevronRight size={18} color={Colors.blueBright} />
      </TouchableOpacity>

      {/* Favorites Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Heart size={17} color={Colors.rose} />
          <Text style={styles.sectionTitle}>Saved Favorites ({favorites.length})</Text>
        </View>

        {favorites.length === 0 ? (
          <Text style={styles.emptyFavText}>
            No favorites saved yet. Tap the heart on deals to pin them here!
          </Text>
        ) : (
          favorites.slice(0, 3).map((fav) => (
            <TouchableOpacity
              key={fav.id}
              style={styles.favItem}
              onPress={() => navigation.navigate("ProductDetail", { productId: fav.product.id })}
              activeOpacity={0.8}
            >
              <Text style={styles.favName} numberOfLines={1}>
                {fav.product.name}
              </Text>
              <Text style={styles.favPrice}>
                ₹{(fav.product.current_price ?? fav.product.discount_price).toFixed(0)}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Backend API Configuration Setting */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Server size={17} color={Colors.primaryBright} />
          <Text style={styles.sectionTitle}>Backend API Configuration</Text>
        </View>

        <Text style={styles.apiDesc}>
          Current FastAPI endpoint: <Text style={{ color: Colors.primaryBright, fontWeight: "700" }}>{apiUrl}</Text>
        </Text>

        {editingApi ? (
          <View style={styles.apiEditForm}>
            <TextInput
              style={styles.apiInput}
              value={apiUrl}
              onChangeText={setApiUrl}
              placeholder="http://192.168.1.X:8000"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
            />
            <View style={styles.apiBtnRow}>
              <TouchableOpacity style={styles.saveApiBtn} onPress={handleSaveApiUrl}>
                <Text style={styles.saveApiText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.resetApiBtn} onPress={handleResetApiUrl}>
                <Text style={styles.resetApiText}>Reset Default</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.editApiBtn} onPress={() => setEditingApi(true)}>
            <Text style={styles.editApiText}>Change Backend Server URL</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Logout Action */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.85}>
        <LogOut size={17} color={Colors.rose} />
        <Text style={styles.logoutText}>Sign Out of Meeva</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: 50,
    paddingBottom: 90,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 22,
    padding: Spacing.md,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: Spacing.md,
    ...Shadows.soft,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  userName: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  userEmail: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    gap: 4,
    marginTop: 6,
    alignSelf: "flex-start",
  },
  badgeText: {
    color: Colors.primary,
    fontWeight: "800",
    fontSize: 10,
  },
  impactCard: {
    backgroundColor: Colors.card,
    borderRadius: 22,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: Spacing.md,
    ...Shadows.soft,
  },
  impactHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: Spacing.md,
  },
  impactTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  impactGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  impactBox: {
    flex: 1,
    backgroundColor: Colors.cardSurface,
    borderRadius: 16,
    padding: Spacing.sm,
    alignItems: "center",
  },
  impactVal: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.primary,
  },
  impactLabel: {
    color: Colors.textMuted,
    marginTop: 4,
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },
  shopSwitchCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.primaryLight,
    padding: Spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 91, 38, 0.2)",
    marginBottom: Spacing.md,
    ...Shadows.soft,
  },
  adminSwitchCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.card,
    padding: Spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: Spacing.md,
    ...Shadows.soft,
  },
  shopSwitchLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  shopSwitchTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.primary,
  },
  shopSwitchSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  section: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: Spacing.md,
    ...Shadows.soft,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.title2,
    fontSize: 14,
  },
  emptyFavText: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  favItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  favName: {
    ...Typography.body,
    fontSize: 13,
    flex: 1,
  },
  favPrice: {
    ...Typography.bodyBold,
    color: Colors.primaryBright,
  },
  apiDesc: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  apiEditForm: {
    gap: Spacing.sm,
  },
  apiInput: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    height: 44,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    fontSize: 13,
  },
  apiBtnRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  saveApiBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    alignItems: "center",
  },
  saveApiText: {
    color: Colors.textInverse,
    fontWeight: "800",
    fontSize: 13,
  },
  resetApiBtn: {
    flex: 1,
    backgroundColor: Colors.cardElevated,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  resetApiText: {
    color: Colors.textSecondary,
    fontWeight: "700",
    fontSize: 13,
  },
  editApiBtn: {
    paddingVertical: 6,
  },
  editApiText: {
    ...Typography.caption,
    color: Colors.primaryBright,
    fontWeight: "700",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.roseLight,
    paddingVertical: 14,
    borderRadius: Radius.md,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.3)",
    marginTop: Spacing.xs,
  },
  logoutText: {
    color: Colors.rose,
    fontWeight: "800",
    fontSize: 14,
  },
  verifyCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: "rgba(245, 158, 11, 0.3)",
    marginBottom: Spacing.md,
    ...Shadows.soft,
  },
  verifyCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  verifyCardTitle: {
    ...Typography.title2,
    fontSize: 14,
    color: Colors.amberBright,
  },
  verifyCardSub: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  verifyMsgText: {
    ...Typography.caption,
    color: Colors.primaryBright,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  verifyBtnRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  instantVerifyBtn: {
    flex: 1.2,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: Radius.sm,
    gap: 6,
  },
  instantVerifyText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 12,
  },
  resendVerifyBtn: {
    flex: 1,
    backgroundColor: Colors.cardElevated,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 5,
  },
  resendVerifyText: {
    color: Colors.textSecondary,
    fontWeight: "700",
    fontSize: 12,
  },
});

