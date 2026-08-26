import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AUTH_TOKEN_KEY, USER_KEY, ROLE_INTENT_KEY } from "../api/client";
import { login as apiLogin, register as apiRegister, getMe, LoginInput, RegisterInput } from "../services/auth";
import { registerForPushNotificationsAsync } from "../services/notifications";
import type { AuthUser } from "../types";

export type RoleIntent = "customer" | "shop";

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  roleIntent: RoleIntent;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
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

        if (storedRole === "shop" || storedRole === "customer") {
          setRoleIntentState(storedRole);
        }

        if (storedToken) {
          try {
            const freshUser = await getMe();
            setToken(storedToken);
            setUser(freshUser);
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(freshUser));
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

    if (res.user.is_shop_owner) {
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

    const targetRole = res.user.is_shop_owner ? "shop" : "customer";
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
