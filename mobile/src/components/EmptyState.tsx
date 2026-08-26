import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { PackageOpen } from "lucide-react-native";
import { Colors, Radius, Spacing, Typography } from "../theme";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        {icon || <PackageOpen size={40} color={Colors.textMuted} />}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionText && onAction && (
        <TouchableOpacity style={styles.actionBtn} onPress={onAction}>
          <Text style={styles.actionText}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    marginTop: Spacing.xl,
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: Radius.full,
    backgroundColor: Colors.cardElevated,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  title: {
    ...Typography.title2,
    fontSize: 18,
    marginBottom: 6,
    textAlign: "center",
  },
  description: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 280,
    marginBottom: Spacing.md,
  },
  actionBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: Radius.sm,
  },
  actionText: {
    color: Colors.textInverse,
    fontWeight: "700",
    fontSize: 13,
  },
});
