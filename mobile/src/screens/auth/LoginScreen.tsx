import React, { useState, useEffect, useRef } from "react";
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
  Image,
} from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShoppingBag,
  Store,
  Sparkles,
  ShieldCheck,
  Zap,
  KeyRound,
  UploadCloud,
  FileCheck,
  MapPin,
  RefreshCw,
  X,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertCircle,
  Navigation,
  Search,
  Check,
} from "lucide-react-native";
import { Colors, Radius, Spacing, Typography, Shadows } from "../../theme";
import { useAuth } from "../../contexts/AuthContext";
import {
  login as apiLogin,
  sendOtp,
  verifyOtp,
  customerSignup,
  vendorSignup,
  forgotPassword,
  resetPassword,
  SendOtpResponse,
} from "../../services/auth";
import {
  getApiBaseUrl,
  setApiBaseUrl,
  resetApiBaseUrl,
  testApiConnection,
  LAN_API_URL,
  TUNNEL_API_URL,
  CURRENT_LAN_IP,
} from "../../config/env";
import { MobileLocationPicker } from "../../components/MobileLocationPicker";

interface AuthScreenProps {
  navigation?: any;
  route?: any;
}

type TabType = "login" | "signup" | "otp" | "forgot_password";
type RoleMode = "customer" | "vendor" | "admin";

export const LoginScreen: React.FC<AuthScreenProps> = ({ navigation, route }) => {
  const { login: authLogin, loginWithSession } = useAuth();

  const initialTab: TabType = route?.params?.tab === "signup" ? "signup" : route?.params?.tab === "forgot" ? "forgot_password" : "login";
  const [tab, setTab] = useState<TabType>(initialTab);
  const [roleMode, setRoleMode] = useState<RoleMode>("customer");
  const [loginAuthType, setLoginAuthType] = useState<"password" | "otp">("password");
  const [otpSourceTab, setOtpSourceTab] = useState<"login" | "signup">("login");

  // Customer Signup fields
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPassword, setCustomerPassword] = useState("");
  const [customerConfirmPassword, setCustomerConfirmPassword] = useState("");

  // Vendor Signup fields
  const [vendorShopName, setVendorShopName] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorPassword, setVendorPassword] = useState("");
  const [vendorConfirmPassword, setVendorConfirmPassword] = useState("");
  const [vendorPhotoUrl, setVendorPhotoUrl] = useState("");
  const [vendorDocUrl, setVendorDocUrl] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");
  const [vendorLat, setVendorLat] = useState("13.0827");
  const [vendorLng, setVendorLng] = useState("80.2707");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // OTP Verification States
  const [otpIdentifier, setOtpIdentifier] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtpLoading, setVerifyingOtpLoading] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpStatusMsg, setOtpStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Forgot Password States
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [showForgotPass, setShowForgotPass] = useState(false);
  const [forgotStep, setForgotStep] = useState<"email" | "reset" | "success">("email");
  const [forgotSending, setForgotSending] = useState(false);
  const [forgotResetting, setForgotResetting] = useState(false);
  const [forgotCooldown, setForgotCooldown] = useState(0);
  const [forgotDevCode, setForgotDevCode] = useState<string | null>(null);
  const [forgotStatusMsg, setForgotStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Server Diagnostics Modal
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

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  useEffect(() => {
    if (forgotCooldown <= 0) return;
    const timer = setInterval(() => {
      setForgotCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [forgotCooldown]);

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

  // Live GPS Detect for Vendor Location
  const handleDetectGps = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location Permission", "Please allow location permission to detect your shop coordinates.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setVendorLat(loc.coords.latitude.toFixed(5));
      setVendorLng(loc.coords.longitude.toFixed(5));

      // Reverse geocode
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${loc.coords.latitude}&lon=${loc.coords.longitude}&format=json`,
          { headers: { "User-Agent": "ExpiryGo-Mobile-App/1.0" } }
        );
        const data = await res.json();
        if (data?.display_name) {
          setVendorAddress(data.display_name);
        }
      } catch {}
      Alert.alert("Location Detected", `Lat: ${loc.coords.latitude.toFixed(4)}, Lng: ${loc.coords.longitude.toFixed(4)}`);
    } catch (err: any) {
      Alert.alert("GPS Error", err.message || "Failed to retrieve location.");
    } finally {
      setGpsLoading(false);
    }
  };

  // Upload Photo for Storefront
  const handlePickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.85,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        setUploadingPhoto(true);
        const asset = result.assets[0];
        try {
          const apiBase = await getApiBaseUrl();
          const formData = new FormData();
          formData.append("file", {
            uri: Platform.OS === "android" ? asset.uri : asset.uri.replace("file://", ""),
            name: "storefront.jpg",
            type: "image/jpeg",
          } as any);

          const res = await fetch(`${apiBase}/auth/upload`, {
            method: "POST",
            body: formData,
          });
          if (res.ok) {
            const data = await res.json();
            setVendorPhotoUrl(data.url || asset.uri);
          } else {
            setVendorPhotoUrl(asset.uri);
          }
          Alert.alert("Photo Attached", "Storefront photo successfully attached ✓");
        } catch {
          setVendorPhotoUrl(asset.uri);
          Alert.alert("Photo Attached", "Storefront photo attached ✓");
        } finally {
          setUploadingPhoto(false);
        }
      }
    } catch (err: any) {
      Alert.alert("Upload Error", err.message || "Failed to select photo.");
    }
  };

  // Upload Doc for Business License
  const handlePickDoc = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.85,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        setUploadingDoc(true);
        const asset = result.assets[0];
        try {
          const apiBase = await getApiBaseUrl();
          const formData = new FormData();
          formData.append("file", {
            uri: Platform.OS === "android" ? asset.uri : asset.uri.replace("file://", ""),
            name: "business_license.jpg",
            type: "image/jpeg",
          } as any);

          const res = await fetch(`${apiBase}/auth/upload`, {
            method: "POST",
            body: formData,
          });
          if (res.ok) {
            const data = await res.json();
            setVendorDocUrl(data.url || asset.uri);
          } else {
            setVendorDocUrl(asset.uri);
          }
          Alert.alert("Document Attached", "Business verification document attached ✓");
        } catch {
          setVendorDocUrl(asset.uri);
          Alert.alert("Document Attached", "Verification document attached ✓");
        } finally {
          setUploadingDoc(false);
        }
      }
    } catch (err: any) {
      Alert.alert("Upload Error", err.message || "Failed to select document.");
    }
  };

  // Send OTP
  const handleSendOtp = async (targetId?: string) => {
    const idToSend = (targetId || otpIdentifier || loginEmail).trim().toLowerCase();
    if (!idToSend) {
      setError("Please enter your email address to receive a login OTP code.");
      return;
    }
    setError(null);
    setSendingOtp(true);
    setOtpStatusMsg(null);
    setOtpCode("");
    try {
      const res = await sendOtp(idToSend);
      setOtpIdentifier(idToSend);
      setOtpCooldown(res.expires_in_seconds || 60);
      setTab("otp");
      setOtpStatusMsg({
        type: "success",
        text: `6-digit verification code sent to ${idToSend}.`,
      });
      if (res.dev_code) {
        setOtpCode(res.dev_code);
      }
    } catch (err: any) {
      const msg = err?.message || "Failed to dispatch verification OTP.";
      setError(msg);
      setOtpStatusMsg({ type: "error", text: msg });
    } finally {
      setSendingOtp(false);
    }
  };

  // Verify OTP
  const handleVerifyOtpSubmit = async () => {
    if (!otpCode.trim() || otpCode.trim().length < 4) {
      setError("Please enter the 6-digit OTP code.");
      return;
    }
    setError(null);
    setVerifyingOtpLoading(true);
    try {
      const isVendorMode = roleMode === "vendor";
      const nameToSend = isVendorMode ? vendorShopName.trim() : customerName.trim();
      const res = await verifyOtp({
        identifier: otpIdentifier.trim().toLowerCase(),
        otp: otpCode.trim(),
        name: nameToSend || undefined,
        is_shop_owner: isVendorMode,
        phone_number: isVendorMode ? vendorPhone.trim() : undefined,
      });
      await loginWithSession(res, isVendorMode ? "shop" : "customer");
    } catch (err: any) {
      setError(err?.message || "Invalid or expired verification code.");
    } finally {
      setVerifyingOtpLoading(false);
    }
  };

  // Sign Up Submission
  const handleSignupSubmit = async () => {
    setError(null);
    setSubmitting(true);
    setOtpCode("");

    try {
      if (roleMode === "customer") {
        if (!customerName.trim() || !customerEmail.trim()) {
          setError("Please enter your name and email address.");
          setSubmitting(false);
          return;
        }
        if (customerPassword && customerPassword.length < 6) {
          setError("Password must be at least 6 characters long.");
          setSubmitting(false);
          return;
        }
        if (customerPassword && customerPassword !== customerConfirmPassword) {
          setError("Passwords do not match. Please re-enter your password.");
          setSubmitting(false);
          return;
        }

        const cleanEmail = customerEmail.trim().toLowerCase();
        const res = await customerSignup({
          name: customerName.trim(),
          email: cleanEmail,
          password: customerPassword.trim() || undefined,
        });

        setOtpIdentifier(cleanEmail);
        setOtpSourceTab("signup");
        setOtpCooldown(res.expires_in_seconds || 60);
        if (res.dev_code) setOtpCode(res.dev_code);
        setTab("otp");
        setOtpStatusMsg({
          type: "success",
          text: `6-digit verification code sent to ${cleanEmail}.`,
        });
      } else {
        // Vendor Signup
        if (!vendorShopName.trim() || !vendorEmail.trim()) {
          setError("Please enter your shop name and email.");
          setSubmitting(false);
          return;
        }
        if (vendorPassword && vendorPassword.length < 6) {
          setError("Password must be at least 6 characters long.");
          setSubmitting(false);
          return;
        }
        if (vendorPassword && vendorPassword !== vendorConfirmPassword) {
          setError("Passwords do not match. Please re-enter your password.");
          setSubmitting(false);
          return;
        }
        const finalPhoto = vendorPhotoUrl || "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=800";
        const finalDoc = vendorDocUrl || "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800";

        const cleanEmail = vendorEmail.trim().toLowerCase();
        const res = await vendorSignup({
          shop_name: vendorShopName.trim(),
          email: cleanEmail,
          phone_number: vendorPhone.trim() || "+91 98765 43210",
          password: vendorPassword.trim() || undefined,
          photo_url: finalPhoto,
          document_url: finalDoc,
          address: vendorAddress.trim() || "Commercial Location",
          latitude: parseFloat(vendorLat) || 13.0827,
          longitude: parseFloat(vendorLng) || 80.2707,
        });

        setOtpIdentifier(cleanEmail);
        setOtpSourceTab("signup");
        setOtpCooldown(res.expires_in_seconds || 60);
        if (res.dev_code) setOtpCode(res.dev_code);
        setTab("otp");
        setOtpStatusMsg({
          type: "success",
          text: `Shop registered! 6-digit code sent to ${cleanEmail}. Location verification running in background.`,
        });
      }
    } catch (err: any) {
      setError(err?.message || "Failed to complete registration.");
    } finally {
      setSubmitting(false);
    }
  };

  // Password Login Submission
  const handlePasswordLoginSubmit = async () => {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const cleanEmail = loginEmail.trim().toLowerCase();
      await authLogin({ email: cleanEmail, password: loginPassword });
    } catch (err: any) {
      const errMsg = err?.message || "Failed to sign in. Please check credentials.";
      if (
        errMsg.toLowerCase().includes("not verified") ||
        errMsg.toLowerCase().includes("verify your email") ||
        errMsg.toLowerCase().includes("via otp") ||
        errMsg.toLowerCase().includes("with otp")
      ) {
        const targetEmail = loginEmail.trim().toLowerCase();
        setOtpIdentifier(targetEmail);
        setOtpSourceTab("login");
        setTab("otp");
        setOtpStatusMsg({
          type: "success",
          text: errMsg,
        });
        await handleSendOtp(targetEmail);
      } else {
        setError(errMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Forgot Password Request
  const handleForgotPasswordRequest = async () => {
    const cleanEmail = (forgotEmail || loginEmail).trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setError(null);
    setForgotSending(true);
    setForgotStatusMsg(null);
    setForgotDevCode(null);
    try {
      setForgotEmail(cleanEmail);
      const res = await forgotPassword(cleanEmail);
      setForgotDevCode(res.dev_code || null);
      setForgotCooldown(res.cooldown_remaining || 60);
      setForgotStep("reset");
      setForgotStatusMsg({
        type: "success",
        text: res.message || `A 6-digit code has been sent to ${cleanEmail}.`,
      });
      if (res.dev_code) {
        setForgotOtp(res.dev_code);
      }
    } catch (err: any) {
      const msg = err?.message || "Failed to send password reset code.";
      setError(msg);
      setForgotStatusMsg({ type: "error", text: msg });
    } finally {
      setForgotSending(false);
    }
  };

  // Reset Password Submit
  const handleResetPasswordSubmit = async () => {
    const cleanOtp = forgotOtp.trim().replace(/\D/g, "");
    if (!cleanOtp || cleanOtp.length < 4) {
      setError("Please enter the 6-digit OTP code.");
      return;
    }
    if (forgotNewPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setError("Passwords do not match. Please verify.");
      return;
    }
    setError(null);
    setForgotResetting(true);
    setForgotStatusMsg(null);
    try {
      const res = await resetPassword({
        email: forgotEmail.trim().toLowerCase(),
        otp: cleanOtp,
        new_password: forgotNewPassword.trim(),
      });
      setForgotStep("success");
      setForgotStatusMsg({
        type: "success",
        text: "Password reset successful! Logging you in...",
      });
      if (res.access_token && res.user) {
        await loginWithSession(
          { access_token: res.access_token, user: res.user as any },
          res.user.role === "VENDOR" || res.user.is_shop_owner ? "shop" : "customer"
        );
      } else {
        setTimeout(() => {
          setTab("login");
          setForgotStep("email");
        }, 1500);
      }
    } catch (err: any) {
      const msg = err?.message || "Failed to reset password.";
      setError(msg);
      setForgotStatusMsg({ type: "error", text: msg });
    } finally {
      setForgotResetting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Main Glass Card */}
        <View style={styles.card}>
          {/* Brand Header */}
          <View style={styles.brandHeader}>
            <View style={styles.logoBadge}>
              <Zap size={22} color="#FFFFFF" fill="#FFFFFF" />
            </View>
            <Text style={styles.brandTitle}>
              Expiry<Text style={{ color: Colors.primaryBright }}>Go</Text>
            </Text>
            <Text style={styles.brandSubtitle}>
              {tab === "signup"
                ? "Create your Customer or Vendor Account"
                : tab === "otp"
                ? "Verify 6-digit OTP Code"
                : tab === "forgot_password"
                ? "Reset your account password"
                : "Sign in to your account"}
            </Text>
          </View>

          {/* Top Tab Switcher: Sign In vs Sign Up (Hidden during Forgot Password & OTP) */}
          {tab !== "otp" && tab !== "forgot_password" && (
            <View style={styles.topTabSwitcher}>
              <TouchableOpacity
                style={[styles.topTabBtn, tab === "login" && styles.topTabBtnActive]}
                onPress={() => {
                  setTab("login");
                  setError(null);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.topTabText, tab === "login" && styles.topTabTextActive]}>
                  Sign In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.topTabBtn, tab === "signup" && styles.topTabBtnActive]}
                onPress={() => {
                  setTab("signup");
                  setError(null);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.topTabText, tab === "signup" && styles.topTabTextActive]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Role Selector (Customer | Vendor | Admin) */}
          {tab !== "otp" && tab !== "forgot_password" && (
            <View style={styles.roleSection}>
              <Text style={styles.sectionLabel}>SELECT ROLE</Text>
              <View style={styles.roleGrid}>
                <TouchableOpacity
                  style={[styles.roleBtn, roleMode === "customer" && styles.roleBtnActiveCustomer]}
                  onPress={() => {
                    setRoleMode("customer");
                    setError(null);
                  }}
                  activeOpacity={0.8}
                >
                  <ShoppingBag size={14} color={roleMode === "customer" ? Colors.primaryBright : Colors.textMuted} />
                  <Text style={[styles.roleBtnText, roleMode === "customer" && { color: Colors.primaryBright }]}>
                    Customer
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.roleBtn, roleMode === "vendor" && styles.roleBtnActiveVendor]}
                  onPress={() => {
                    setRoleMode("vendor");
                    setError(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Store size={14} color={roleMode === "vendor" ? Colors.amberBright : Colors.textMuted} />
                  <Text style={[styles.roleBtnText, roleMode === "vendor" && { color: Colors.amberBright }]}>
                    Vendor
                  </Text>
                </TouchableOpacity>

                {tab === "login" && (
                  <TouchableOpacity
                    style={[styles.roleBtn, roleMode === "admin" && styles.roleBtnActiveAdmin]}
                    onPress={() => {
                      setRoleMode("admin");
                      setError(null);
                    }}
                    activeOpacity={0.8}
                  >
                    <Sparkles size={14} color={roleMode === "admin" ? "#c084fc" : Colors.textMuted} />
                    <Text style={[styles.roleBtnText, roleMode === "admin" && { color: "#c084fc" }]}>
                      Admin
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Error Message Box */}
          {error && (
            <View style={styles.errorBox}>
              <AlertCircle size={14} color={Colors.roseBright} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* ============================================================ */}
          {/* TAB 1: SIGN IN (PASSWORD vs 6-DIGIT OTP) */}
          {/* ============================================================ */}
          {tab === "login" && (
            <View style={styles.formContainer}>
              {/* Method Switcher */}
              <View style={styles.methodToggleContainer}>
                <TouchableOpacity
                  style={[styles.methodToggleBtn, loginAuthType === "password" && styles.methodToggleBtnActive]}
                  onPress={() => {
                    setLoginAuthType("password");
                    setError(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.methodToggleText, loginAuthType === "password" && styles.methodToggleTextActive]}>
                    Password Sign In
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.methodToggleBtn, loginAuthType === "otp" && styles.methodToggleBtnActive]}
                  onPress={() => {
                    setLoginAuthType("otp");
                    setError(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.methodToggleText, loginAuthType === "otp" && styles.methodToggleTextActive]}>
                    6-Digit OTP Sign In
                  </Text>
                </TouchableOpacity>
              </View>

              {loginAuthType === "password" ? (
                <View style={styles.inputsStack}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      {roleMode === "admin" ? "ADMIN EMAIL" : roleMode === "vendor" ? "VENDOR EMAIL" : "EMAIL ADDRESS"}
                    </Text>
                    <View style={styles.inputBox}>
                      <Mail size={16} color={Colors.textMuted} />
                      <TextInput
                        style={styles.textInput}
                        placeholder={roleMode === "admin" ? "admin@expirygo.com" : "name@example.com"}
                        placeholderTextColor={Colors.textMuted}
                        value={loginEmail}
                        onChangeText={setLoginEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <Text style={styles.inputLabel}>PASSWORD</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setForgotEmail(loginEmail);
                          setTab("forgot_password");
                          setForgotStep("email");
                          setError(null);
                          setForgotStatusMsg(null);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.linkText, { color: Colors.primaryBright, fontWeight: "700" }]}>Forgot password?</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.inputBox}>
                      <Lock size={16} color={Colors.textMuted} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="••••••••"
                        placeholderTextColor={Colors.textMuted}
                        value={loginPassword}
                        onChangeText={setLoginPassword}
                        secureTextEntry={!showPassword}
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                        {showPassword ? <EyeOff size={16} color={Colors.textMuted} /> : <Eye size={16} color={Colors.textMuted} />}
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setLoginAuthType("otp");
                        setError(null);
                      }}
                      style={{ alignSelf: "flex-end", marginTop: 4 }}
                    >
                      <Text style={styles.linkText}>⚡ Account created via OTP? Sign in via OTP</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.submitBtn,
                      roleMode === "admin"
                        ? { backgroundColor: "#9333ea" }
                        : roleMode === "vendor"
                        ? { backgroundColor: "#ea580c" }
                        : { backgroundColor: Colors.primary },
                      submitting && styles.btnDisabled,
                    ]}
                    onPress={handlePasswordLoginSubmit}
                    disabled={submitting}
                    activeOpacity={0.85}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <ShieldCheck size={18} color="#FFFFFF" />
                        <Text style={styles.submitBtnText}>
                          {roleMode === "admin"
                            ? "Sign In to Admin Console"
                            : roleMode === "vendor"
                            ? "Sign In as Vendor"
                            : "Sign In"}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                /* OTP Mode */
                <View style={styles.inputsStack}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>EMAIL ADDRESS TO RECEIVE OTP</Text>
                    <View style={styles.inputBox}>
                      <Mail size={16} color={Colors.textMuted} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="name@example.com"
                        placeholderTextColor={Colors.textMuted}
                        value={loginEmail}
                        onChangeText={setLoginEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.submitBtn, sendingOtp && styles.btnDisabled]}
                    onPress={() => {
                      setOtpSourceTab("login");
                      handleSendOtp(loginEmail);
                    }}
                    disabled={sendingOtp}
                    activeOpacity={0.85}
                  >
                    {sendingOtp ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Zap size={18} color="#FFFFFF" />
                        <Text style={styles.submitBtnText}>Send 6-Digit Login Code</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* ============================================================ */}
          {/* TAB 2: SIGN UP (CUSTOMER / VENDOR) */}
          {/* ============================================================ */}
          {tab === "signup" && (
            <View style={styles.formContainer}>
              {roleMode === "customer" ? (
                <View style={styles.inputsStack}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>CUSTOMER FULL NAME</Text>
                    <View style={styles.inputBox}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g. John Doe"
                        placeholderTextColor={Colors.textMuted}
                        value={customerName}
                        onChangeText={setCustomerName}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                    <View style={styles.inputBox}>
                      <Mail size={16} color={Colors.textMuted} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="name@example.com"
                        placeholderTextColor={Colors.textMuted}
                        value={customerEmail}
                        onChangeText={setCustomerEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>CREATE PASSWORD *</Text>
                    <View style={styles.inputBox}>
                      <Lock size={16} color={Colors.textMuted} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="Min 6 characters"
                        placeholderTextColor={Colors.textMuted}
                        value={customerPassword}
                        onChangeText={setCustomerPassword}
                        secureTextEntry={!showSignupPassword}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>CONFIRM PASSWORD *</Text>
                    <View style={styles.inputBox}>
                      <Lock size={16} color={Colors.textMuted} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="Repeat password"
                        placeholderTextColor={Colors.textMuted}
                        value={customerConfirmPassword}
                        onChangeText={setCustomerConfirmPassword}
                        secureTextEntry={!showSignupPassword}
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() => setShowSignupPassword(!showSignupPassword)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.checkbox, showSignupPassword && styles.checkboxActive]}>
                      {showSignupPassword && <Check size={12} color="#FFF" />}
                    </View>
                    <Text style={styles.checkboxText}>Show password text</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.submitBtn, submitting && styles.btnDisabled]}
                    onPress={handleSignupSubmit}
                    disabled={submitting}
                    activeOpacity={0.85}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Zap size={18} color="#FFFFFF" />
                        <Text style={styles.submitBtnText}>Continue with OTP Verification</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                /* Vendor Mode */
                <View style={styles.inputsStack}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>SHOP / STORE NAME</Text>
                    <View style={styles.inputBox}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g. Green Valley Supermarket"
                        placeholderTextColor={Colors.textMuted}
                        value={vendorShopName}
                        onChangeText={setVendorShopName}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>VENDOR EMAIL ADDRESS</Text>
                    <View style={styles.inputBox}>
                      <Mail size={16} color={Colors.textMuted} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="vendor@example.com"
                        placeholderTextColor={Colors.textMuted}
                        value={vendorEmail}
                        onChangeText={setVendorEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>PHONE NUMBER</Text>
                    <View style={styles.inputBox}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="+91 9876543210"
                        placeholderTextColor={Colors.textMuted}
                        value={vendorPhone}
                        onChangeText={setVendorPhone}
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>CREATE LOGIN PASSWORD *</Text>
                    <View style={styles.inputBox}>
                      <Lock size={16} color={Colors.textMuted} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="Min 6 characters"
                        placeholderTextColor={Colors.textMuted}
                        value={vendorPassword}
                        onChangeText={setVendorPassword}
                        secureTextEntry={!showSignupPassword}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>CONFIRM PASSWORD *</Text>
                    <View style={styles.inputBox}>
                      <Lock size={16} color={Colors.textMuted} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="Repeat password"
                        placeholderTextColor={Colors.textMuted}
                        value={vendorConfirmPassword}
                        onChangeText={setVendorConfirmPassword}
                        secureTextEntry={!showSignupPassword}
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() => setShowSignupPassword(!showSignupPassword)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.checkbox, showSignupPassword && styles.checkboxActive]}>
                      {showSignupPassword && <Check size={12} color="#FFF" />}
                    </View>
                    <Text style={styles.checkboxText}>Show password text</Text>
                  </TouchableOpacity>

                  {/* Upload Storefront Photo */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>SHOP STOREFRONT PHOTO *</Text>
                    <TouchableOpacity
                      style={[styles.uploadBox, vendorPhotoUrl ? styles.uploadBoxDone : null]}
                      onPress={handlePickPhoto}
                      activeOpacity={0.8}
                    >
                      <UploadCloud size={18} color={vendorPhotoUrl ? Colors.primaryBright : Colors.amberBright} />
                      <Text style={styles.uploadBoxText} numberOfLines={1}>
                        {uploadingPhoto
                          ? "Uploading Photo..."
                          : vendorPhotoUrl
                          ? "Storefront Photo Uploaded ✓"
                          : "Upload Storefront Photo (Required)"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Upload Verification Document */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>BUSINESS LICENSE / FSSAI / GST *</Text>
                    <TouchableOpacity
                      style={[styles.uploadBox, vendorDocUrl ? styles.uploadBoxDone : null]}
                      onPress={handlePickDoc}
                      activeOpacity={0.8}
                    >
                      <FileCheck size={18} color={vendorDocUrl ? Colors.primaryBright : Colors.amberBright} />
                      <Text style={styles.uploadBoxText} numberOfLines={1}>
                        {uploadingDoc
                          ? "Uploading Document..."
                          : vendorDocUrl
                          ? "Verification Doc Uploaded ✓"
                          : "Upload Verification Doc (PDF/Image) *"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Interactive Physical Location Live HD Map */}
                  <MobileLocationPicker
                    initialLat={parseFloat(vendorLat) || 13.0827}
                    initialLng={parseFloat(vendorLng) || 80.2707}
                    initialAddress={vendorAddress}
                    onLocationChange={({ lat: newLat, lng: newLng, address: newAddr }) => {
                      setVendorLat(newLat.toFixed(5));
                      setVendorLng(newLng.toFixed(5));
                      setVendorAddress(newAddr);
                    }}
                    label="Storefront Physical Location (Direct Live HD Map)"
                    required={true}
                  />

                  <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: "#ea580c" }, submitting && styles.btnDisabled]}
                    onPress={handleSignupSubmit}
                    disabled={submitting}
                    activeOpacity={0.85}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Zap size={18} color="#FFFFFF" />
                        <Text style={styles.submitBtnText}>Register Store & Verify OTP</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* ============================================================ */}
          {/* TAB 3: 6-DIGIT OTP VERIFICATION */}
          {/* ============================================================ */}
          {tab === "otp" && (
            <View style={styles.inputsStack}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>6-DIGIT VERIFICATION CODE</Text>
                <View style={[styles.inputBox, { justifyContent: "center" }]}>
                  <TextInput
                    style={[styles.textInput, styles.otpInput]}
                    placeholder="••••••"
                    placeholderTextColor={Colors.textMuted}
                    value={otpCode}
                    onChangeText={(t) => setOtpCode(t.replace(/\D/g, ""))}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
              </View>

              {otpStatusMsg && (
                <View
                  style={[
                    styles.statusBanner,
                    otpStatusMsg.type === "success" ? styles.statusBannerSuccess : styles.statusBannerError,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBannerText,
                      { color: otpStatusMsg.type === "success" ? Colors.primaryBright : Colors.roseBright },
                    ]}
                  >
                    {otpStatusMsg.text}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.submitBtn, (verifyingOtpLoading || otpCode.length < 4) && styles.btnDisabled]}
                onPress={handleVerifyOtpSubmit}
                disabled={verifyingOtpLoading || otpCode.length < 4}
                activeOpacity={0.85}
              >
                {verifyingOtpLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <ShieldCheck size={18} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>Verify OTP & Complete Sign In</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.otpFooterRow}>
                <TouchableOpacity onPress={() => setTab(otpSourceTab || "login")} activeOpacity={0.8}>
                  <Text style={styles.linkText}>← Back to {otpSourceTab === "signup" ? "Sign Up" : "Sign In"}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleSendOtp(otpIdentifier)}
                  disabled={sendingOtp || otpCooldown > 0}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.linkText, { color: Colors.primaryBright, fontWeight: "800" }]}>
                    {sendingOtp ? "Sending..." : otpCooldown > 0 ? `Resend in ${otpCooldown}s` : "Resend OTP"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ============================================================ */}
          {/* TAB 4: FORGOT PASSWORD FLOW */}
          {/* ============================================================ */}
          {tab === "forgot_password" && (
            <View style={styles.inputsStack}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder }}>
                <TouchableOpacity
                  onPress={() => {
                    setTab("login");
                    setError(null);
                    setForgotStatusMsg(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.linkText, { fontWeight: "700" }]}>← Back to Sign In</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 11, fontWeight: "800", color: Colors.primaryBright }}>
                  PASSWORD RECOVERY
                </Text>
              </View>

              {forgotStep === "email" && (
                <>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: Colors.textPrimary, marginTop: 4 }}>
                    Forgot your password?
                  </Text>
                  <Text style={{ fontSize: 12, color: Colors.textMuted, marginBottom: 8 }}>
                    Enter your email to receive a secure 6-digit OTP code to set a new password.
                  </Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>ACCOUNT EMAIL ADDRESS</Text>
                    <View style={styles.inputBox}>
                      <Mail size={16} color={Colors.textMuted} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="name@example.com"
                        placeholderTextColor={Colors.textMuted}
                        value={forgotEmail}
                        onChangeText={setForgotEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.submitBtn, (forgotSending || !forgotEmail.trim()) && styles.btnDisabled]}
                    onPress={handleForgotPasswordRequest}
                    disabled={forgotSending || !forgotEmail.trim()}
                    activeOpacity={0.85}
                  >
                    {forgotSending ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Zap size={18} color="#FFFFFF" />
                        <Text style={styles.submitBtnText}>Send 6-Digit Reset Code</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {forgotStep === "reset" && (
                <>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: Colors.textPrimary, marginTop: 4 }}>
                    Set New Password
                  </Text>
                  <Text style={{ fontSize: 12, color: Colors.textMuted, marginBottom: 8 }}>
                    Verification code sent to <Text style={{ color: Colors.textPrimary, fontWeight: "700" }}>{forgotEmail}</Text>
                  </Text>

                  {forgotDevCode && (
                    <View style={[styles.statusBanner, styles.statusBannerSuccess, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
                      <Text style={[styles.statusBannerText, { color: Colors.primaryBright, fontWeight: "700" }]}>
                        Dev Code: {forgotDevCode}
                      </Text>
                      <TouchableOpacity onPress={() => setForgotOtp(forgotDevCode)}>
                        <Text style={{ fontSize: 11, fontWeight: "800", color: Colors.primaryBright }}>FILL CODE</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>6-DIGIT VERIFICATION CODE</Text>
                    <View style={[styles.inputBox, { justifyContent: "center" }]}>
                      <TextInput
                        style={[styles.textInput, styles.otpInput]}
                        placeholder="••••••"
                        placeholderTextColor={Colors.textMuted}
                        value={forgotOtp}
                        onChangeText={(t) => setForgotOtp(t.replace(/\D/g, ""))}
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>NEW PASSWORD *</Text>
                    <View style={styles.inputBox}>
                      <Lock size={16} color={Colors.textMuted} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="Min 6 characters"
                        placeholderTextColor={Colors.textMuted}
                        value={forgotNewPassword}
                        onChangeText={setForgotNewPassword}
                        secureTextEntry={!showForgotPass}
                      />
                      <TouchableOpacity onPress={() => setShowForgotPass(!showForgotPass)} style={{ padding: 4 }}>
                        {showForgotPass ? <EyeOff size={16} color={Colors.textMuted} /> : <Eye size={16} color={Colors.textMuted} />}
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>CONFIRM NEW PASSWORD *</Text>
                    <View style={styles.inputBox}>
                      <Lock size={16} color={Colors.textMuted} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="Repeat new password"
                        placeholderTextColor={Colors.textMuted}
                        value={forgotConfirmPassword}
                        onChangeText={setForgotConfirmPassword}
                        secureTextEntry={!showForgotPass}
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.submitBtn, (forgotResetting || forgotOtp.length < 4 || forgotNewPassword.length < 6) && styles.btnDisabled]}
                    onPress={handleResetPasswordSubmit}
                    disabled={forgotResetting || forgotOtp.length < 4 || forgotNewPassword.length < 6}
                    activeOpacity={0.85}
                  >
                    {forgotResetting ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <ShieldCheck size={18} color="#FFFFFF" />
                        <Text style={styles.submitBtnText}>Reset Password & Sign In</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <View style={styles.otpFooterRow}>
                    <TouchableOpacity onPress={() => { setForgotStep("email"); setError(null); }} activeOpacity={0.8}>
                      <Text style={styles.linkText}>← Change Email</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleForgotPasswordRequest}
                      disabled={forgotSending || forgotCooldown > 0}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.linkText, { color: Colors.primaryBright, fontWeight: "800" }]}>
                        {forgotSending ? "Sending..." : forgotCooldown > 0 ? `Resend in ${forgotCooldown}s` : "Resend OTP"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {forgotStep === "success" && (
                <View style={{ alignItems: "center", paddingVertical: 20 }}>
                  <CheckCircle2 size={40} color={Colors.primaryBright} />
                  <Text style={{ fontSize: 16, fontWeight: "800", color: Colors.textPrimary, marginTop: 12 }}>
                    Password Reset Successfully!
                  </Text>
                  <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 4 }}>
                    Signing you in...
                  </Text>
                  <ActivityIndicator size="small" color={Colors.primaryBright} style={{ marginTop: 12 }} />
                </View>
              )}
            </View>
          )}

          {/* Connection Status Badge */}
          <TouchableOpacity
            style={styles.serverBadge}
            onPress={() => {
              handleTestConnection();
              setServerModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Wifi size={12} color={Colors.primaryBright} />
            <Text style={styles.serverBadgeText} numberOfLines={1}>
              Backend: {currentApiUrl || "Auto Detecting..."}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Diagnostics Server Settings Modal */}
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

            <View style={styles.presetContainer}>
              <TouchableOpacity
                style={[styles.presetBtn, customIp.includes(CURRENT_LAN_IP) && styles.presetBtnActive]}
                onPress={() => {
                  setCustomIp(LAN_API_URL);
                  handleTestConnection(LAN_API_URL);
                }}
              >
                <Text style={styles.presetTitle}>📶 Local Wi-Fi LAN</Text>
                <Text style={styles.presetSub} numberOfLines={1}>{LAN_API_URL}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.presetBtn, customIp.includes("loca.lt") && styles.presetBtnActive]}
                onPress={() => {
                  setCustomIp(TUNNEL_API_URL);
                  handleTestConnection(TUNNEL_API_URL);
                }}
              >
                <Text style={styles.presetTitle}>🌐 Cloud Tunnel</Text>
                <Text style={styles.presetSub} numberOfLines={1}>{TUNNEL_API_URL}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>SERVER URL</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.textInput}
                  value={customIp}
                  onChangeText={setCustomIp}
                  placeholder="http://192.168.1.X:8000"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                />
              </View>
            </View>

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

            <TouchableOpacity
              style={styles.testBtn}
              onPress={() => handleTestConnection()}
              disabled={connectionStatus.testing}
            >
              <RefreshCw size={14} color={Colors.primaryBright} />
              <Text style={styles.testBtnText}>Test Live Connection</Text>
            </TouchableOpacity>

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
    backgroundColor: "#070A10",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === "ios" ? 50 : 30,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadows.card,
  },
  brandHeader: {
    alignItems: "center",
    gap: 4,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    ...Shadows.hover,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  topTabSwitcher: {
    flexDirection: "row",
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  topTabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: Radius.sm,
  },
  topTabBtnActive: {
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    ...Shadows.soft,
  },
  topTabText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textMuted,
  },
  topTabTextActive: {
    color: Colors.primaryBright,
    fontWeight: "800",
  },
  roleSection: {
    gap: 6,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  roleGrid: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: Colors.background,
    padding: 4,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  roleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: Radius.sm,
    gap: 5,
  },
  roleBtnActiveCustomer: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.4)",
  },
  roleBtnActiveVendor: {
    backgroundColor: "rgba(234, 88, 12, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(234, 88, 12, 0.4)",
  },
  roleBtnActiveAdmin: {
    backgroundColor: "rgba(147, 51, 234, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(147, 51, 234, 0.4)",
  },
  roleBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textMuted,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(244, 63, 94, 0.12)",
    borderColor: "rgba(244, 63, 94, 0.35)",
    borderWidth: 1,
    borderRadius: Radius.sm,
    padding: 10,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: Colors.roseBright,
  },
  formContainer: {
    gap: Spacing.md,
  },
  methodToggleContainer: {
    flexDirection: "row",
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  methodToggleBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: Radius.sm,
  },
  methodToggleBtnActive: {
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  methodToggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  methodToggleTextActive: {
    color: Colors.primaryBright,
    fontWeight: "800",
  },
  inputsStack: {
    gap: Spacing.sm,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: Spacing.md,
    height: 48,
    gap: 8,
  },
  textInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  otpInput: {
    textAlign: "center",
    letterSpacing: 10,
    fontSize: 22,
    fontWeight: "900",
    color: Colors.primaryBright,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 4,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  uploadBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: Colors.cardBorder,
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    gap: 8,
  },
  uploadBoxDone: {
    borderColor: Colors.primaryBright,
    backgroundColor: "rgba(16, 185, 129, 0.08)",
  },
  uploadBoxText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  gpsDetectBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    gap: 4,
  },
  gpsDetectBtnText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  helperText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    height: 50,
    borderRadius: Radius.full,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 6,
    ...Shadows.hover,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  btnDisabled: {
    opacity: 0.65,
  },
  linkText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textMuted,
  },
  statusBanner: {
    padding: 10,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  statusBannerSuccess: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  statusBannerError: {
    backgroundColor: "rgba(244, 63, 94, 0.1)",
    borderColor: "rgba(244, 63, 94, 0.3)",
  },
  statusBannerText: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  otpFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  serverBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    gap: 6,
    alignSelf: "center",
    marginTop: 4,
  },
  serverBadgeText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: "600",
    maxWidth: 260,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalCard: {
    width: "100%",
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadows.card,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  modalDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
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
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  presetTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  presetSub: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  statusBoxSuccess: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  statusBoxError: {
    backgroundColor: "rgba(244, 63, 94, 0.1)",
    borderColor: "rgba(244, 63, 94, 0.3)",
  },
  statusBoxText: {
    fontSize: 11,
    fontWeight: "700",
    flex: 1,
  },
  testBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    gap: 6,
  },
  testBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.primaryBright,
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  resetBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingVertical: 11,
    borderRadius: Radius.sm,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  saveBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 11,
    borderRadius: Radius.sm,
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
