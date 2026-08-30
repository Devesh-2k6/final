import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Flame, Compass, ShoppingBag, User, Sparkles, Layers } from "lucide-react-native";
import { Colors, Radius, Shadows } from "../theme";

import { DealsFeedScreen } from "../screens/customer/DealsFeedScreen";
import { MapScreen } from "../screens/customer/MapScreen";
import { ReservationsScreen } from "../screens/customer/ReservationsScreen";
import { ProfileScreen } from "../screens/customer/ProfileScreen";
import { ProductDetailScreen } from "../screens/customer/ProductDetailScreen";
import { CheckoutScreen } from "../screens/customer/CheckoutScreen";
import { NotificationsScreen } from "../screens/customer/NotificationsScreen";
import { DigitalFridgeScreen } from "../screens/customer/DigitalFridgeScreen";
import { ScannerScreen } from "../screens/ScannerScreen";
import { useLanguage } from "../contexts/LanguageContext";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function DealsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DealsFeed" component={DealsFeedScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Scanner" component={ScannerScreen} />
    </Stack.Navigator>
  );
}

function FridgeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DigitalFridge" component={DigitalFridgeScreen} />
      <Stack.Screen name="Scanner" component={ScannerScreen} />
    </Stack.Navigator>
  );
}

function ReservationsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ReservationsList" component={ReservationsScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
    </Stack.Navigator>
  );
}

export function CustomerTabs() {
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
          fontSize: 10,
          fontWeight: "700",
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="DealsTab"
        component={DealsStack}
        options={{
          tabBarLabel: t("tabs.deals"),
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Flame color={focused ? Colors.primary : color} size={20} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="FridgeTab"
        component={FridgeStack}
        options={{
          tabBarLabel: "My Fridge",
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Sparkles color={focused ? Colors.primary : color} size={20} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="MapTab"
        component={MapScreen}
        options={{
          tabBarLabel: t("tabs.explore"),
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Compass color={focused ? Colors.primary : color} size={20} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="ReservationsTab"
        component={ReservationsStack}
        options={{
          tabBarLabel: t("tabs.pickups"),
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <ShoppingBag color={focused ? Colors.primary : color} size={20} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{
          tabBarLabel: t("tabs.profile"),
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <User color={focused ? Colors.primary : color} size={20} />
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
