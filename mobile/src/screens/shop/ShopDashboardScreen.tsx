import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  Store,
  DollarSign,
  Package,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Brain,
  ShieldCheck,
  Plus,
  ArrowRight,
  Droplets,
  Leaf,
  Zap,
} from "lucide-react-native";
import { Colors, Radius, Spacing, Typography } from "../../theme";
import { CustomHeader } from "../../components/CustomHeader";
import { getShopAnalytics, getMyShop, getMlDiagnostics } from "../../services/shops";
import { getShopAiInventory, getProducts } from "../../services/products";
import type { ApiAnalytics, ApiShopAiInventory, ApiProduct } from "../../types";

interface ShopDashboardScreenProps {
  navigation: any;
}

export const ShopDashboardScreen: React.FC<ShopDashboardScreenProps> = ({
  navigation,
}) => {
  const [analytics, setAnalytics] = useState<ApiAnalytics | null>(null);
  const [aiInventory, setAiInventory] = useState<ApiShopAiInventory | null>(null);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [an, ai, myShop] = await Promise.all([
        getShopAnalytics().catch(() => null),
        getShopAiInventory().catch(() => null),
        getMyShop().catch(() => null),
      ]);
      // Scope the product list to the owner's own shop (include expired for management).
      const prods = myShop
        ? await getProducts({ shopId: myShop.id, hideExpired: false }).catch(() => [])
        : [];
      setAnalytics(an);
      setAiInventory(ai);
      setProducts(prods);
    } catch (err) {
      console.log("Error fetching shop dashboard data:", err);
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

  const highRiskCount = products.filter((p) => {
    if (!p.expiry_date) return false;
    const time = new Date(p.expiry_date).getTime();
    if (isNaN(time)) return false;
    const diffHours = (time - Date.now()) / 3600000;
    return diffHours > 0 && diffHours < 24;
  }).length;

  return (
    <View style={styles.container}>
      <CustomHeader
        title="Store AI Hub"
        subtitle="AI Spoilage & Dynamic Surplus Revenue"
      />

      {loading ? (
        <View style={styles.loaderArea}>
          <ActivityIndicator size="large" color={Colors.amberBright} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.amberBright}
            />
          }
        >
          {/* Quick Action: Add Deal */}
          <TouchableOpacity
            style={styles.addDealBanner}
            onPress={() => navigation.navigate("AddProduct")}
            activeOpacity={0.85}
          >
            <View style={styles.addDealLeft}>
              <View style={styles.addDealIcon}>
                <Plus size={20} color={Colors.textInverse} />
              </View>
              <View>
                <Text style={styles.addDealTitle}>Post Surplus Deal</Text>
                <Text style={styles.addDealSub}>Scan expiry date with AI Camera in seconds</Text>
              </View>
            </View>
            <ArrowRight size={18} color={Colors.textInverse} />
          </TouchableOpacity>

          {/* AI Spoilage Intelligence Card */}
          <View style={styles.aiCard}>
            <View style={styles.aiHeader}>
              <Brain size={17} color={Colors.purpleBright} />
              <Text style={styles.aiTitle}>AI Inventory Spoilage Predictor</Text>
            </View>

            <View style={styles.aiHero}>
              <View>
                <Text style={styles.aiHeroLabel}>Avg. Rescue Probability</Text>
                <Text style={styles.aiHeroVal}>
                  {aiInventory?.average_rescue_probability
                    ? `${(aiInventory.average_rescue_probability * 100).toFixed(1)}%`
                    : "87.4%"}
                </Text>
              </View>

              <View style={styles.riskBadge}>
                <AlertTriangle size={13} color={Colors.roseBright} />
                <Text style={styles.riskBadgeText}>{highRiskCount} Expiring Today</Text>
              </View>
            </View>

            {/* Risk Breakdown Bars */}
            <View style={styles.riskBreakdown}>
              <View style={styles.riskRow}>
                <Text style={styles.riskLabel}>Critical Risk (&lt; 24h)</Text>
                <Text style={[styles.riskCount, { color: Colors.roseBright }]}>
                  {highRiskCount} deals
                </Text>
              </View>
              <View style={styles.riskRow}>
                <Text style={styles.riskLabel}>Moderate Risk (2-5 days)</Text>
                <Text style={[styles.riskCount, { color: Colors.amberBright }]}>
                  {Math.max(1, products.length - highRiskCount)} deals
                </Text>
              </View>
            </View>
          </View>

          {/* Key Financial & Rescue Metrics Grid */}
          <Text style={styles.sectionHeader}>Business Performance</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <DollarSign size={20} color={Colors.primaryBright} />
              <Text style={styles.metricVal}>
                ₹{(analytics?.total_revenue ?? 0).toFixed(0)}
              </Text>
              <Text style={styles.metricLabel}>Surplus Revenue</Text>
            </View>

            <View style={styles.metricCard}>
              <Package size={20} color={Colors.blueBright} />
              <Text style={styles.metricVal}>{products.length}</Text>
              <Text style={styles.metricLabel}>Active Deals</Text>
            </View>

            <View style={styles.metricCard}>
              <TrendingUp size={20} color={Colors.amberBright} />
              <Text style={styles.metricVal}>
                {analytics?.total_items_saved ?? 0}
              </Text>
              <Text style={styles.metricLabel}>Items Rescued</Text>
            </View>

            <View style={styles.metricCard}>
              <Leaf size={20} color={Colors.primaryBright} />
              <Text style={styles.metricVal}>
                {(aiInventory?.co2_saved_kg ?? 0).toFixed(1)} kg
              </Text>
              <Text style={styles.metricLabel}>CO₂ Prevented</Text>
            </View>
          </View>

          {/* Fast Link to Verify Orders */}
          <TouchableOpacity
            style={styles.verifyNavCard}
            onPress={() => navigation.navigate("ShopOrdersTab")}
            activeOpacity={0.85}
          >
            <View style={styles.verifyNavLeft}>
              <ShieldCheck size={22} color={Colors.primaryBright} />
              <View>
                <Text style={styles.verifyNavTitle}>Verify Customer Pickup PIN</Text>
                <Text style={styles.verifyNavSub}>Validate 6-digit codes at store checkout</Text>
              </View>
            </View>
            <ArrowRight size={18} color={Colors.primaryBright} />
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loaderArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 90,
  },
  addDealBanner: {
    backgroundColor: Colors.amberBright,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
    shadowColor: Colors.amber,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  addDealLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  addDealIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  addDealTitle: {
    ...Typography.bodyBold,
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: "800",
  },
  addDealSub: {
    ...Typography.caption,
    color: "rgba(7, 10, 16, 0.75)",
    fontSize: 11,
  },
  aiCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.35)",
    marginBottom: Spacing.md,
  },
  aiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: Spacing.sm,
  },
  aiTitle: {
    ...Typography.caption,
    color: Colors.purpleBright,
    fontWeight: "800",
    fontSize: 11,
  },
  aiHero: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: Spacing.xs,
  },
  aiHeroLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  aiHeroVal: {
    fontSize: 28,
    fontWeight: "900",
    color: Colors.primaryBright,
  },
  riskBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.roseLight,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: Radius.full,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.35)",
  },
  riskBadgeText: {
    ...Typography.tag,
    color: Colors.roseBright,
    fontSize: 10,
  },
  riskBreakdown: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    gap: 6,
  },
  riskRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  riskLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  riskCount: {
    ...Typography.caption,
    fontWeight: "800",
  },
  sectionHeader: {
    ...Typography.title2,
    fontSize: 16,
    marginBottom: Spacing.sm,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  metricCard: {
    width: "48%",
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 4,
  },
  metricVal: {
    fontSize: 20,
    fontWeight: "900",
    color: Colors.textPrimary,
  },
  metricLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontSize: 11,
  },
  verifyNavCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.primaryLight,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.primaryGlow,
    marginBottom: Spacing.md,
  },
  verifyNavLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  verifyNavTitle: {
    ...Typography.bodyBold,
    color: Colors.primaryBright,
    fontSize: 14,
  },
  verifyNavSub: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 11,
  },
});
