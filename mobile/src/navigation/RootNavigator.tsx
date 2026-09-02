import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Colors } from "../theme";
import { useAuth } from "../contexts/AuthContext";

import { LoginScreen } from "../screens/auth/LoginScreen";
import { RegisterScreen } from "../screens/auth/RegisterScreen";

import { CustomerTabs } from "./CustomerTabs";
import { ShopTabs } from "./ShopTabs";
import { AddEditProductScreen } from "../screens/shop/AddEditProductScreen";
import { ProductDetailScreen } from "../screens/customer/ProductDetailScreen";
import { CheckoutScreen } from "../screens/customer/CheckoutScreen";
import { NotificationsScreen } from "../screens/customer/NotificationsScreen";
import { AdminDashboardScreen } from "../screens/admin/AdminDashboardScreen";
import { ScannerScreen } from "../screens/ScannerScreen";

const Stack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

export function RootNavigator() {
  const { user, token, isLoading, roleIntent } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!token ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : user?.role === "ADMIN" ? (
          <>
            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
            <Stack.Screen name="CustomerRoot" component={CustomerTabs} />
            <Stack.Screen name="ShopRoot" component={ShopTabs} />
            <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
            <Stack.Screen
              name="Scanner"
              component={ScannerScreen}
              options={{ presentation: "fullScreenModal" }}
            />
          </>
        ) : roleIntent === "shop" ? (
          <>
            <Stack.Screen name="ShopRoot" component={ShopTabs} />
            <Stack.Screen
              name="AddProduct"
              component={AddEditProductScreen}
              options={{ presentation: "modal" }}
            />
            <Stack.Screen
              name="Scanner"
              component={ScannerScreen}
              options={{ presentation: "fullScreenModal" }}
            />
            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="CustomerRoot" component={CustomerTabs} />
            <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
            <Stack.Screen name="Checkout" component={CheckoutScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen
              name="Scanner"
              component={ScannerScreen}
              options={{ presentation: "fullScreenModal" }}
            />
            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
});
