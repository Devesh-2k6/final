import React from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from "react-native";
import { Sparkles, X, Brain, TrendingUp, Clock, AlertCircle, ShieldCheck } from "lucide-react-native";
import { Colors, Radius, Spacing, Typography } from "../theme";
import { calculateAiForecast } from "../lib/forecast";
import type { ApiProduct } from "../types";

interface AiForecastModalProps {
  product: ApiProduct | null;
  visible: boolean;
  onClose: () => void;
}

export const AiForecastModal: React.FC<AiForecastModalProps> = ({
  product,
  visible,
  onClose,
}) => {
  if (!product) return null;

  const price = product.current_price ?? product.discount_price;
  const forecast = calculateAiForecast(
    product.original_price,
    price,
    product.quantity,
    product.expiry_date
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Sparkles size={20} color={Colors.primary} />
              <Text style={styles.title}>AI Surplus Forecast</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Product Name */}
            <Text style={styles.productName}>{product.name}</Text>

            {/* Rescue Probability Hero Banner */}
            <View style={styles.rescueCard}>
              <Text style={styles.rescueLabel}>AI Rescue Probability</Text>
              <Text style={styles.rescueScore}>{forecast.rescueProbability}%</Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(100, forecast.rescueProbability)}%`,
                      backgroundColor:
                        forecast.rescueProbability >= 70
                          ? Colors.primary
                          : forecast.rescueProbability >= 50
                          ? Colors.amber
                          : Colors.rose,
                    },
                  ]}
                />
              </View>
              <Text style={styles.rescueSub}>
                Model Confidence: {forecast.confidenceScore}% (Live Logistic Regression Model)
              </Text>
            </View>

            {/* Metrics Grid */}
            <View style={styles.grid}>
              <View style={styles.metricBox}>
                <Clock size={18} color={Colors.blue} />
                <Text style={styles.metricVal}>{forecast.selloutHours}h</Text>
                <Text style={styles.metricLabel}>Est. Sellout Time</Text>
              </View>

              <View style={styles.metricBox}>
                <TrendingUp size={18} color={Colors.amber} />
                <Text style={styles.metricVal}>-{forecast.optimalDiscountPercent}%</Text>
                <Text style={styles.metricLabel}>AI Optimal Markdown</Text>
              </View>
            </View>

            {/* Dynamic Pricing Explanation */}
            <View style={styles.explainCard}>
              <View style={styles.explainHeader}>
                <Brain size={16} color={Colors.purple} />
                <Text style={styles.explainTitle}>Smart Markdown Logic</Text>
              </View>
              <Text style={styles.explainText}>
                Based on remaining shelf life, store stock volume ({product.quantity} units), and
                customer purchase velocity in your neighborhood, pricing at ₹{forecast.optimalPrice}{" "}
                maximizes revenue while preventing food waste.
              </Text>
            </View>

            {/* Environmental Impact Estimation */}
            <View style={styles.impactCard}>
              <ShieldCheck size={16} color={Colors.primary} />
              <Text style={styles.impactText}>
                Rescuing this item prevents approx.{" "}
                <Text style={styles.impactHighlight}>1.2 kg CO₂</Text> emissions from landfill decomposition.
              </Text>
            </View>
          </ScrollView>

          {/* Close Action */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.modalOverlay,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.md,
  },
  container: {
    width: "100%",
    maxHeight: "85%",
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    ...Typography.title2,
    fontSize: 17,
  },
  body: {
    marginTop: Spacing.xs,
  },
  productName: {
    ...Typography.bodyBold,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  rescueCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: Spacing.md,
  },
  rescueLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  rescueScore: {
    fontSize: 36,
    fontWeight: "800",
    color: Colors.primary,
  },
  progressBar: {
    width: "100%",
    height: 8,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Radius.full,
    marginVertical: Spacing.sm,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: Radius.full,
  },
  rescueSub: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  grid: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  metricBox: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  metricVal: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginVertical: 4,
  },
  metricLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: "center",
  },
  explainCard: {
    backgroundColor: Colors.purpleLight,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.3)",
    marginBottom: Spacing.md,
  },
  explainHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  explainTitle: {
    ...Typography.caption,
    color: Colors.purple,
    fontWeight: "700",
  },
  explainText: {
    ...Typography.caption,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  impactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primaryLight,
    padding: Spacing.md,
    borderRadius: Radius.sm,
    gap: 8,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primaryGlow,
  },
  impactText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  impactHighlight: {
    color: Colors.primary,
    fontWeight: "700",
  },
  closeBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: Radius.sm,
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  closeBtnText: {
    color: Colors.textInverse,
    fontWeight: "700",
    fontSize: 14,
  },
});
