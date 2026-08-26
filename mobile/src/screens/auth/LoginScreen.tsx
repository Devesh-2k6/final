import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  Alert,
} from "react-native";
import {
  Mail,
  Lock,
  ArrowRight,
  Wifi,
  WifiOff,
  RefreshCw,
  X,
  Zap,
} from "lucide-react-native";
import { Colors, Radius, Spacing, Typography, Shadows } from "../../theme";
import { useAuth } from "../../contexts/AuthContext";
import {
  getApiBaseUrl,
  setApiBaseUrl,
  resetApiBaseUrl,
  testApiConnection,
  LAN_API_URL,
  TUNNEL_API_URL,
  CURRENT_LAN_IP,
} from "../../config/env";

interface LoginScreenProps {
  navigation: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Server diagnostics modal state
  const [serverModalVisible, setServerModalVisible] = useState(false);
  const [currentApiUrl, setCurrentApiUrl] = useState("");
  const [customIp, setCustomIp] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<{
    testing: boolean;
    success?: boolean;
    latencyMs?: number;
    message?: string;
  }>({ testing: false });

  useEffect(() => {
    async function initUrl() {
      const url = await getApiBaseUrl();
      setCurrentApiUrl(url);
      setCustomIp(url);
    }
    initUrl();
  }, []);

  const handleTestConnection = async (urlToTest?: string) => {
    const target = urlToTest || customIp || currentApiUrl;
    setConnectionStatus({ testing: true });
    const result = await testApiConnection(target);
    setConnectionStatus({
      testing: false,
      success: result.success,
      latencyMs: result.latencyMs,
      message: result.message,
    });
  };

  const handleSaveCustomServer = async () => {
    if (!customIp.trim()) return;
    let formatted = customIp.trim();
    if (!formatted.startsWith("http://") && !formatted.startsWith("https://")) {
      formatted = `http://${formatted}`;
    }
    await setApiBaseUrl(formatted);
    setCurrentApiUrl(formatted);
    Alert.alert("Server Updated", `Backend target set to: ${formatted}`);
    setServerModalVisible(false);
  };

  const handleResetDefaultServer = async () => {
    await resetApiBaseUrl();
    const def = await getApiBaseUrl();
    setCurrentApiUrl(def);
    setCustomIp(def);
    Alert.alert("Reset", "Reset to default platform URL.");
    setServerModalVisible(false);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login({ email: email.trim(), password });
    } catch (err: any) {
      const errMsg = err.message || "Failed to log in. Please check your credentials.";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Zap size={28} color={Colors.primaryBright} fill={Colors.primaryBright} />
          </View>
          <Text style={styles.title}>Welcome to ExpiryGo</Text>
          <Text style={styles.subtitle}>
            Sign in to rescue surplus deals or manage your store inventory.
          </Text>
        </View>

        {/* Error Alert */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            {error.toLowerCase().includes("timeout") || error.toLowerCase().includes("network") || error.toLowerCase().includes("server") ? (
              <TouchableOpacity
                style={styles.errorActionBtn}
                onPress={() => {
                  handleTestConnection();
                  setServerModalVisible(true);
                }}
              >
                <RefreshCw size={13} color={Colors.roseBright} />
                <Text style={styles.errorActionBtnText}>Switch Server / Test Connection</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* Form Inputs */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputContainer}>
              <Mail size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="name@example.com"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <Lock size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.textInverse} />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Sign In</Text>
                <ArrowRight size={18} color={Colors.textInverse} />
              </>
            )}
          </TouchableOpacity>

          {/* Switch to Register */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Register")}>
              <Text style={styles.footerLink}>Create Account</Text>
            </TouchableOpacity>
          </View>

          {/* Server Connection Badge */}
          <TouchableOpacity
            style={styles.serverBadge}
            onPress={() => {
              handleTestConnection();
              setServerModalVisible(true);
            }}
          >
            <Wifi size={13} color={Colors.primaryBright} />
            <Text style={styles.serverBadgeText} numberOfLines={1}>
              Backend: {currentApiUrl || "Auto Detecting..."}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Diagnostics Modal */}
      <Modal
        visible={serverModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setServerModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Backend Server Settings</Text>
              <TouchableOpacity onPress={() => setServerModalVisible(false)}>
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Select a connection preset or enter a custom backend URL:
            </Text>

            {/* Quick 1-Tap Presets */}
            <View style={styles.presetContainer}>
              <TouchableOpacity
                style={[
                  styles.presetBtn,
                  customIp.includes("loca.lt") && styles.presetBtnActive,
                ]}
                onPress={() => {
                  setCustomIp(TUNNEL_API_URL);
                  handleTestConnection(TUNNEL_API_URL);
                }}
              >
                <Text style={styles.presetTitle}>🌐 Cloud Tunnel (Recommended)</Text>
                <Text style={styles.presetSub} numberOfLines={1}>{TUNNEL_API_URL}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.presetBtn,
                  customIp.includes(CURRENT_LAN_IP) && styles.presetBtnActive,
                ]}
                onPress={() => {
                  setCustomIp(LAN_API_URL);
                  handleTestConnection(LAN_API_URL);
                }}
              >
                <Text style={styles.presetTitle}>📶 Local Wi-Fi LAN</Text>
                <Text style={styles.presetSub} numberOfLines={1}>{LAN_API_URL}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.serverInputGroup}>
              <Text style={styles.serverInputLabel}>Server URL</Text>
              <TextInput
                style={styles.serverInput}
                value={customIp}
                onChangeText={setCustomIp}
                placeholder="http://192.168.1.X:8000"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
              />
            </View>

            {/* Connection Test Output */}
            {connectionStatus.testing ? (
              <View style={[styles.statusBox, { borderColor: Colors.cardBorder }]}>
                <ActivityIndicator size="small" color={Colors.primaryBright} />
                <Text style={styles.statusBoxText}>Testing connection to server...</Text>
              </View>
            ) : connectionStatus.success !== undefined ? (
              <View
                style={[
                  styles.statusBox,
                  connectionStatus.success ? styles.statusBoxSuccess : styles.statusBoxError,
                ]}
              >
                {connectionStatus.success ? (
                  <Wifi size={16} color={Colors.primaryBright} />
                ) : (
                  <WifiOff size={16} color={Colors.roseBright} />
                )}
                <Text
                  style={[
                    styles.statusBoxText,
                    { color: connectionStatus.success ? Colors.primaryBright : Colors.roseBright },
                  ]}
                >
                  {connectionStatus.message}
                </Text>
              </View>
            ) : null}

            {/* Test Action */}
            <TouchableOpacity
              style={styles.testBtn}
              onPress={() => handleTestConnection()}
              disabled={connectionStatus.testing}
            >
              <RefreshCw size={15} color={Colors.primaryBright} />
              <Text style={styles.testBtnText}>Test Live Connection</Text>
            </TouchableOpacity>

            {/* Actions */}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity style={styles.resetBtn} onPress={handleResetDefaultServer}>
                <Text style={styles.resetBtnText}>Reset Auto</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveCustomServer}>
                <Text style={styles.saveBtnText}>Save & Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1.5,
    borderColor: Colors.primaryGlow,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  title: {
    ...Typography.hero,
    fontSize: 24,
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    ...Typography.caption,
    textAlign: "center",
    color: Colors.textSecondary,
    maxWidth: 290,
  },
  errorBox: {
    backgroundColor: Colors.roseLight,
    borderColor: "rgba(244, 63, 94, 0.4)",
    borderWidth: 1,
    padding: Spacing.md,
    borderRadius: Radius.sm,
    marginBottom: Spacing.md,
    gap: 8,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.roseBright,
    fontWeight: "700",
  },
  errorActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(244, 63, 94, 0.15)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.3)",
    alignSelf: "flex-start",
  },
  errorActionBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.roseBright,
  },
  presetContainer: {
    gap: 8,
  },
  presetBtn: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: Radius.sm,
    padding: 10,
  },
  presetBtnActive: {
    borderColor: Colors.primaryBright,
    backgroundColor: Colors.primaryLight,
  },
  presetTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  presetSub: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  form: {
    gap: Spacing.md,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    height: 52,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    ...Shadows.soft,
  },
  input: {
    flex: 1,
    marginLeft: Spacing.sm,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: Radius.full,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: Spacing.xs,
    ...Shadows.hover,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: Spacing.sm,
  },
  footerText: {
    ...Typography.body,
    fontSize: 14,
  },
  footerLink: {
    ...Typography.bodyBold,
    color: Colors.primaryBright,
    fontSize: 14,
  },
  serverBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.card,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 6,
    marginTop: Spacing.sm,
  },
  serverBadgeText: {
    ...Typography.tag,
    color: Colors.textMuted,
    fontSize: 11,
    maxWidth: 240,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.modalOverlay,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.md,
  },
  modalCard: {
    width: "100%",
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: Spacing.md,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    ...Typography.title2,
    fontSize: 17,
  },
  modalDescription: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  serverInputGroup: {
    gap: 6,
  },
  serverInputLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  serverInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    height: 44,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  statusBoxSuccess: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primaryGlow,
  },
  statusBoxError: {
    backgroundColor: Colors.roseLight,
    borderColor: "rgba(244, 63, 94, 0.4)",
  },
  statusBoxText: {
    ...Typography.caption,
    fontWeight: "600",
    flex: 1,
  },
  testBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primaryLight,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.primaryGlow,
  },
  testBtnText: {
    ...Typography.caption,
    color: Colors.primaryBright,
    fontWeight: "700",
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    alignItems: "center",
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  resetBtnText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    alignItems: "center",
    backgroundColor: Colors.primary,
  },
  saveBtnText: {
    ...Typography.caption,
    color: Colors.textInverse,
    fontWeight: "700",
  },
});
