import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { BarChart3, Package, ShieldCheck, Settings } from "lucide-react-native";
import { Colors, Radius, Shadows } from "../theme";

import { ShopDashboardScreen } from "../screens/shop/ShopDashboardScreen";
import { ShopProductsScreen } from "../screens/shop/ShopProductsScreen";
import { AddEditProductScreen } from "../screens/shop/AddEditProductScreen";
import { ShopOrdersScreen } from "../screens/shop/ShopOrdersScreen";
import { ShopSettingsScreen } from "../screens/shop/ShopSettingsScreen";
import { ScannerScreen } from "../screens/ScannerScreen";
import { useLanguage } from "../contexts/LanguageContext";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function ShopProductsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ShopProductsList" component={ShopProductsScreen} />
      <Stack.Screen name="AddProduct" component={AddEditProductScreen} />
      <Stack.Screen name="Scanner" component={ScannerScreen} />
    </Stack.Navigator>
  );
}

function ShopDashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ShopDashboardMain" component={ShopDashboardScreen} />
      <Stack.Screen name="AddProduct" component={AddEditProductScreen} />
      <Stack.Screen name="Scanner" component={ScannerScreen} />
    </Stack.Navigator>
  );
}

export function ShopTabs() {
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor: Colors.cardBorder,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 84 : 70,
          paddingBottom: Platform.OS === "ios" ? 24 : 12,
          paddingTop: 8,
          ...Shadows.card,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="ShopDashboardTab"
        component={ShopDashboardStack}
        options={{
          tabBarLabel: t("tabs.shop_hub"),
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <BarChart3 color={focused ? Colors.primary : color} size={20} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="ShopProductsTab"
        component={ShopProductsStack}
        options={{
          tabBarLabel: t("tabs.shop_products"),
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Package color={focused ? Colors.primary : color} size={20} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="ShopOrdersTab"
        component={ShopOrdersScreen}
        options={{
          tabBarLabel: t("tabs.shop_orders"),
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <ShieldCheck color={focused ? Colors.primary : color} size={20} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="ShopSettingsTab"
        component={ShopSettingsScreen}
        options={{
          tabBarLabel: t("tabs.shop_settings"),
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Settings color={focused ? Colors.primary : color} size={20} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: Colors.primaryLight,
  },
});
