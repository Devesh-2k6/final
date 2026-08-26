import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
} from "react-native";
import {
  Users,
  Store,
  ShieldAlert,
  TrendingUp,
  Search,
  Trash2,
  CheckCircle,
  ArrowLeft,
  Filter,
} from "lucide-react-native";
import { Colors, Radius, Spacing, Typography } from "../../theme";

interface AdminDashboardScreenProps {
  navigation: any;
}

export const AdminDashboardScreen: React.FC<AdminDashboardScreenProps> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [reports, setReports] = useState([
    {
      id: "1",
      product: "Expired Sourdough Bread",
      shop: "Corner Bakery",
      reason: "Item was past hard expiry date upon inspection",
      reporter: "user_492",
      date: "Today, 11:20 AM",
      status: "PENDING",
    },
    {
      id: "2",
      product: "Milk 1L Packet",
      shop: "Daily Mart",
      reason: "Suspected fake price markdown",
      reporter: "user_811",
      date: "Yesterday",
      status: "PENDING",
    },
    {
      id: "3",
      product: "Fresh Croissant Box",
      shop: "Le Petit Paris",
      reason: "Store was closed during pickup window",
      reporter: "user_103",
      date: "2 days ago",
      status: "RESOLVED",
    },
  ]);

  const stats = [
    { name: "Total Rescuers", value: "14,502", icon: Users, change: "+12%" },
    { name: "Active Stores", value: "843", icon: Store, change: "+5%" },
    { name: "Flagged Listings", value: String(reports.filter(r => r.status === "PENDING").length), icon: ShieldAlert, danger: true, change: "-2" },
    { name: "Food Saved (kg)", value: "2,370", icon: TrendingUp, change: "+24%" },
  ];

  const handleDismiss = (id: string) => {
    setReports((prev) => prev.filter((r) => r.id !== id));
    Alert.alert("Report Dismissed", "Listing has been cleared from moderation queue.");
  };

  const handleRemoveListing = (id: string) => {
    setReports((prev) => prev.filter((r) => r.id !== id));
    Alert.alert("Listing Suspended", "The reported listing was taken down.");
  };

  const filteredReports = reports.filter(
    (r) =>
      r.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.shop.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Platform Moderation</Text>
          <Text style={styles.headerSub}>Reports & Trust Center</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Analytics Grid */}
        <View style={styles.statsGrid}>
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <View key={stat.name} style={styles.statCard}>
                <View style={styles.statTop}>
                  <Icon size={18} color={stat.danger ? Colors.rose : Colors.primary} />
                  <View
                    style={[
                      styles.changeBadge,
                      stat.danger ? styles.changeDanger : styles.changeSuccess,
                    ]}
                  >
                    <Text
                      style={[
                        styles.changeText,
                        stat.danger ? { color: Colors.rose } : { color: Colors.primary },
                      ]}
                    >
                      {stat.change}
                    </Text>
                  </View>
                </View>
                <Text style={styles.statVal}>{stat.value}</Text>
                <Text style={styles.statName}>{stat.name}</Text>
              </View>
            );
          })}
        </View>

        {/* Moderation Queue Section */}
        <View style={styles.queueHeader}>
          <Text style={styles.queueTitle}>Reported Listings Queue</Text>
          <Text style={styles.queueSub}>Review flagged products and audit seller accuracy</Text>
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Search size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search flagged items or shops..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Reports List */}
        {filteredReports.map((report) => (
          <View key={report.id} style={styles.reportCard}>
            <View style={styles.reportTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.reportProduct}>{report.product}</Text>
                <Text style={styles.reportShop}>Store: {report.shop}</Text>
              </View>
              <View style={styles.dangerTag}>
                <Text style={styles.dangerTagText}>Flagged</Text>
              </View>
            </View>

            <Text style={styles.reportReason}>{report.reason}</Text>

            <View style={styles.reportFooter}>
              <Text style={styles.reportMeta}>
                By {report.reporter} • {report.date}
              </Text>

              <View style={styles.reportActions}>
                <TouchableOpacity
                  style={styles.dismissAction}
                  onPress={() => handleDismiss(report.id)}
                >
                  <CheckCircle size={14} color={Colors.primary} />
                  <Text style={styles.dismissActionText}>Clear</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.removeAction}
                  onPress={() => handleRemoveListing(report.id)}
                >
                  <Trash2 size={14} color={Colors.rose} />
                  <Text style={styles.removeActionText}>Take Down</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
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
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  backBtn: {
    padding: 8,
    borderRadius: Radius.sm,
    backgroundColor: Colors.cardElevated,
  },
  headerTitle: {
    ...Typography.title1,
    fontSize: 20,
  },
  headerSub: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 40,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    width: "48%",
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  statTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  changeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  changeSuccess: {
    backgroundColor: Colors.primaryLight,
  },
  changeDanger: {
    backgroundColor: Colors.roseLight,
  },
  changeText: {
    ...Typography.tag,
    fontSize: 9,
  },
  statVal: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginVertical: 2,
  },
  statName: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontSize: 11,
  },
  queueHeader: {
    marginBottom: Spacing.sm,
  },
  queueTitle: {
    ...Typography.title2,
    fontSize: 17,
  },
  queueSub: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: Spacing.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    color: Colors.textPrimary,
    fontSize: 13,
  },
  reportCard: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: Spacing.sm,
  },
  reportTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  reportProduct: {
    ...Typography.bodyBold,
    fontSize: 15,
  },
  reportShop: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  dangerTag: {
    backgroundColor: Colors.roseLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  dangerTagText: {
    ...Typography.tag,
    color: Colors.rose,
    fontSize: 9,
  },
  reportReason: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.textPrimary,
    backgroundColor: Colors.card,
    padding: Spacing.sm,
    borderRadius: Radius.xs,
    marginVertical: Spacing.xs,
  },
  reportFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  reportMeta: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  reportActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  dismissAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.xs,
  },
  dismissActionText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: "700",
    fontSize: 11,
  },
  removeAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.roseLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.xs,
  },
  removeActionText: {
    ...Typography.caption,
    color: Colors.rose,
    fontWeight: "700",
    fontSize: 11,
  },
});
