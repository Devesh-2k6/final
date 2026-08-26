import React from "react";
import { View, Text, StyleSheet } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { QrCode, KeyRound, ShieldCheck, Zap } from "lucide-react-native";
import { Colors, Radius, Spacing, Typography } from "../theme";

interface PinCodeDisplayProps {
  pickupCode: string;
  reservationId?: string;
}

export const PinCodeDisplay: React.FC<PinCodeDisplayProps> = ({
  pickupCode,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <QrCode size={18} color={Colors.primary} />
        <Text style={styles.title}>Store Counter Pickup</Text>
      </View>

      {/* 3 Simple Steps */}
      <View style={styles.stepsRow}>
        <View style={styles.stepItem}>
          <View style={styles.stepCircle}><Text style={styles.stepNum}>1</Text></View>
          <Text style={styles.stepLabel}>Go to Store</Text>
        </View>
        <View style={styles.stepLine} />
        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, styles.stepCircleActive]}><Text style={styles.stepNumActive}>2</Text></View>
          <Text style={styles.stepLabel}>Show PIN</Text>
        </View>
        <View style={styles.stepLine} />
        <View style={styles.stepItem}>
          <View style={styles.stepCircle}><Text style={styles.stepNum}>3</Text></View>
          <Text style={styles.stepLabel}>Take Food</Text>
        </View>
      </View>

      {/* 6-Digit PIN Digital Number Boxes */}
      <Text style={styles.pinLabel}>YOUR 6-DIGIT PICKUP PIN</Text>
      <View style={styles.pinContainer}>
        {pickupCode.split("").map((digit, idx) => (
          <View key={idx} style={styles.digitBox}>
            <Text style={styles.digitText}>{digit}</Text>
          </View>
        ))}
      </View>

      {/* Scannable High-Contrast QR Code */}
      <View style={styles.qrContainer}>
        <View style={styles.qrWrapper}>
          <QRCode
            value={`EXPIRYGO:${pickupCode}`}
            size={150}
            color="#000000"
            backgroundColor="#FFFFFF"
            quietZone={8}
          />
        </View>
        <Text style={styles.qrHint}>Or let the cashier scan this QR code</Text>
      </View>

      <View style={styles.footer}>
        <ShieldCheck size={16} color={Colors.success} />
        <Text style={styles.footerText}>Food Reserved • Ready for Counter Pickup</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.cardBorderHighlight,
    alignItems: "center",
    marginVertical: Spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  title: {
    ...Typography.title2,
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  stepsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    backgroundColor: Colors.cardSurface,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Radius.md,
    marginBottom: 16,
  },
  stepItem: {
    alignItems: "center",
    gap: 4,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleActive: {
    backgroundColor: Colors.primary,
  },
  stepNum: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.textSecondary,
  },
  stepNumActive: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFF",
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.cardBorder,
    marginHorizontal: 8,
    marginBottom: 14,
  },
  pinLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: Colors.primary,
    marginBottom: 8,
  },
  qrContainer: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  qrWrapper: {
    backgroundColor: "#FFFFFF",
    padding: 10,
    borderRadius: Radius.md,
    shadowColor: Colors.primaryBright,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  qrHint: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 8,
  },
  pinContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: Spacing.md,
  },
  digitBox: {
    width: 44,
    height: 52,
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  digitText: {
    fontSize: 24,
    fontWeight: "900",
    color: Colors.primary,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  footerText: {
    ...Typography.caption,
    color: Colors.success,
    fontWeight: "700",
    fontSize: 12,
  },
});
