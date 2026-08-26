import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Radius, Typography } from "../theme";
import type { UrgencyBadgeInfo } from "../lib/formatters";

interface Props {
  badge: UrgencyBadgeInfo;
}

export const UrgencyBadge: React.FC<Props> = ({ badge }) => {
  return (
    <View style={[styles.container, { backgroundColor: badge.bgColor }]}>
      <Text style={styles.icon}>{badge.icon}</Text>
      <Text style={[styles.label, { color: badge.color }]}>{badge.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  icon: {
    fontSize: 11,
    marginRight: 4,
  },
  label: {
    ...Typography.tag,
  },
});
