import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Bell, LayoutGrid, Store, ShoppingBag, Globe } from "lucide-react-native";
import { Colors, Radius, Shadows, Spacing, Typography } from "../theme";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { LanguageSelectorModal } from "./LanguageSelectorModal";

interface CustomHeaderProps {
  title?: string;
  subtitle?: string;
  onPressNotifications?: () => void;
  showRoleToggle?: boolean;
}

export const CustomHeader: React.FC<CustomHeaderProps> = ({
  title = "ExpiryGo",
  subtitle,
  onPressNotifications,
  showRoleToggle = true,
}) => {
  const { user, roleIntent, setRoleIntent } = useAuth();
  const { currentLanguageMeta, t } = useLanguage();
  const [langModalVisible, setLangModalVisible] = useState(false);

  const handleToggleRole = () => {
    const nextRole = roleIntent === "customer" ? "shop" : "customer";
    setRoleIntent(nextRole);
  };

  return (
    <View style={styles.container}>
      {/* Left Menu / App Icon */}
      <View style={styles.leftSection}>
        <View style={styles.gridBtn}>
          <LayoutGrid size={18} color={Colors.textPrimary} />
        </View>
        <View style={styles.titleColumn}>
          <Text style={styles.brandTitle}>{title}</Text>
          {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
        </View>
      </View>

      {/* Right Action Icons */}
      <View style={styles.rightActions}>
        {/* Language Picker Button */}
        <TouchableOpacity
          style={styles.langBtn}
          onPress={() => setLangModalVisible(true)}
          activeOpacity={0.8}
        >
          <Globe size={13} color={Colors.primary} />
          <Text style={styles.langFlag}>{currentLanguageMeta.flag}</Text>
        </TouchableOpacity>

        {showRoleToggle && user?.is_shop_owner && (
          <TouchableOpacity
            style={[
              styles.roleToggle,
              roleIntent === "shop" ? styles.roleToggleShop : styles.roleToggleCustomer,
            ]}
            onPress={handleToggleRole}
            activeOpacity={0.8}
          >
            {roleIntent === "shop" ? (
              <>
                <Store size={12} color={Colors.primary} />
                <Text style={styles.roleTextShop}>{t("role.store_mode")}</Text>
              </>
            ) : (
              <>
                <ShoppingBag size={12} color={Colors.primary} />
                <Text style={styles.roleTextCustomer}>{t("role.shopper")}</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {onPressNotifications && (
          <TouchableOpacity
            style={styles.circleBtn}
            onPress={onPressNotifications}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Bell size={18} color={Colors.textPrimary} />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        )}
      </View>

      {/* Language Selector Modal */}
      <LanguageSelectorModal
        visible={langModalVisible}
        onClose={() => setLangModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingTop: 10,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  gridBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.soft,
  },
  titleColumn: {
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  circleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    ...Shadows.soft,
  },
  notifDot: {
    position: "absolute",
    top: 10,
    right: 11,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  roleToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    backgroundColor: Colors.card,
    borderColor: Colors.cardBorder,
    ...Shadows.soft,
  },
  roleToggleCustomer: {
    borderColor: Colors.cardBorder,
  },
  roleToggleShop: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  roleTextCustomer: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  roleTextShop: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.primary,
  },
  langBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    backgroundColor: Colors.card,
    borderColor: Colors.cardBorder,
    ...Shadows.soft,
  },
  langFlag: {
    fontSize: 12,
  },
});
