import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AUTH_TOKEN_KEY, USER_KEY, ROLE_INTENT_KEY } from "../api/client";
import { login as apiLogin, register as apiRegister, getMe, LoginInput, RegisterInput } from "../services/auth";
import { registerForPushNotificationsAsync } from "../services/notifications";
import type { AuthUser } from "../types";

export type RoleIntent = "customer" | "shop" | "admin";

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  roleIntent: RoleIntent;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  loginWithSession: (res: { access_token: string; user: AuthUser }, role?: RoleIntent) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setRoleIntent: (role: RoleIntent) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [roleIntent, setRoleIntentState] = useState<RoleIntent>("customer");
  const [isLoading, setIsLoading] = useState(true);

  // Restore token, user data, and role intent on startup
  useEffect(() => {
    async function loadStoredAuth() {
      try {
        const storedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        const storedUser = await AsyncStorage.getItem(USER_KEY);
        const storedRole = await AsyncStorage.getItem(ROLE_INTENT_KEY);

        if (storedRole === "shop" || storedRole === "customer" || storedRole === "admin") {
          setRoleIntentState(storedRole as RoleIntent);
        }

        if (storedToken) {
          try {
            const freshUser = await getMe();
            setToken(storedToken);
            setUser(freshUser);
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(freshUser));
            if (freshUser.role === "ADMIN") {
              setRoleIntentState("admin");
            }
          } catch (err: any) {
            // Token is invalid/expired (e.g. server database reseeded or expired)
            console.log("Stored token invalid or expired, clearing session:", err?.message);
            await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
            await AsyncStorage.removeItem(USER_KEY);
            setToken(null);
            setUser(null);
          }
        }
      } catch (err) {
        console.log("Error loading stored auth:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadStoredAuth();
  }, []);

  const login = async (input: LoginInput) => {
    const res = await apiLogin(input);
    setToken(res.access_token);
    setUser(res.user);

    await AsyncStorage.setItem(AUTH_TOKEN_KEY, res.access_token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(res.user));

    if (res.user.role === "ADMIN") {
      setRoleIntentState("admin");
      await AsyncStorage.setItem(ROLE_INTENT_KEY, "admin");
    } else if (res.user.is_shop_owner || res.user.role === "VENDOR") {
      setRoleIntentState("shop");
      await AsyncStorage.setItem(ROLE_INTENT_KEY, "shop");
    } else {
      setRoleIntentState("customer");
      await AsyncStorage.setItem(ROLE_INTENT_KEY, "customer");
    }

    // Initialize push notifications asynchronously without blocking
    registerForPushNotificationsAsync().catch(() => {});
  };

  const register = async (input: RegisterInput) => {
    const res = await apiRegister(input);
    setToken(res.access_token);
    setUser(res.user);

    await AsyncStorage.setItem(AUTH_TOKEN_KEY, res.access_token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(res.user));

    const targetRole = res.user.role === "ADMIN" ? "admin" : (res.user.is_shop_owner || res.user.role === "VENDOR") ? "shop" : "customer";
    setRoleIntentState(targetRole);
    await AsyncStorage.setItem(ROLE_INTENT_KEY, targetRole);

    registerForPushNotificationsAsync().catch(() => {});
  };

  const loginWithSession = async (res: { access_token: string; user: AuthUser }, role?: RoleIntent) => {
    setToken(res.access_token);
    setUser(res.user);

    await AsyncStorage.setItem(AUTH_TOKEN_KEY, res.access_token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(res.user));

    let targetRole: RoleIntent = "customer";
    if (res.user.role === "ADMIN") {
      targetRole = "admin";
    } else if (res.user.is_shop_owner || res.user.role === "VENDOR" || role === "shop") {
      targetRole = "shop";
    } else {
      targetRole = "customer";
    }
    setRoleIntentState(targetRole);
    await AsyncStorage.setItem(ROLE_INTENT_KEY, targetRole);

    registerForPushNotificationsAsync().catch(() => {});
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
  };

  const refreshUser = useCallback(async () => {
    try {
      const freshUser = await getMe();
      setUser(freshUser);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(freshUser));
    } catch (err) {
      console.log("Failed to refresh user:", err);
      await logout();
    }
  }, []);

  const setRoleIntent = async (role: RoleIntent) => {
    if (role === "admin" && user?.role !== "ADMIN") {
      return;
    }
    setRoleIntentState(role);
    await AsyncStorage.setItem(ROLE_INTENT_KEY, role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        roleIntent,
        login,
        register,
        loginWithSession,
        logout,
        refreshUser,
        setRoleIntent,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
