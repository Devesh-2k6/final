import React, { useState } from "react";
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
  Alert,
} from "react-native";
import { Sparkles, Mail, Lock, User, Phone, ArrowRight, Store, ShoppingBag, Zap } from "lucide-react-native";
import { Colors, Radius, Spacing, Typography } from "../../theme";
import { useAuth } from "../../contexts/AuthContext";

interface RegisterScreenProps {
  navigation: any;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [isShopOwner, setIsShopOwner] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setError("Please fill in name, email, and password.");
      Alert.alert("Missing Fields", "Please enter your name, email, and password.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address (e.g. name@example.com)");
      Alert.alert("Invalid Email", "Please enter a valid email address (e.g. name@example.com)");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters for security.");
      Alert.alert("Weak Password", "Password must be at least 6 characters for security.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone_number: phone.trim() || undefined,
        is_shop_owner: isShopOwner,
      });
    } catch (err: any) {
      const msg = err.message || "Failed to create account. Please try again.";
      setError(msg);
      if (msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("email")) {
        Alert.alert(
          "Email Already Registered",
          "An account with this email already exists. Please Sign In instead or use a different email address.",
          [
            { text: "Sign In", onPress: () => navigation.navigate("Login") },
            { text: "OK", style: "cancel" },
          ]
        );
      } else {
        Alert.alert("Registration Error", msg);
      }
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
            <Zap size={28} color={Colors.primary} fill={Colors.primary} />
          </View>
          <Text style={styles.title}>Join ExpiryGo</Text>
          <Text style={styles.subtitle}>
            Create an account to rescue surplus food or sell expiring inventory.
          </Text>
        </View>

        {/* Role Selector Card */}
        <View style={styles.roleSelection}>
          <TouchableOpacity
            style={[styles.roleCard, !isShopOwner && styles.roleCardActive]}
            onPress={() => setIsShopOwner(false)}
            activeOpacity={0.85}
          >
            <ShoppingBag size={22} color={!isShopOwner ? Colors.primaryBright : Colors.textMuted} />
            <Text style={[styles.roleTitle, !isShopOwner && styles.roleTitleActive]}>
              Food Rescuer
            </Text>
            <Text style={styles.roleDesc}>Buy surplus food at up to 70% off</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleCard, isShopOwner && styles.roleCardActiveShop]}
            onPress={() => setIsShopOwner(true)}
            activeOpacity={0.85}
          >
            <Store size={22} color={isShopOwner ? Colors.amberBright : Colors.textMuted} />
            <Text style={[styles.roleTitle, isShopOwner && { color: Colors.amberBright }]}>
              Store Owner
            </Text>
            <Text style={styles.roleDesc}>Sell surplus & eliminate food waste</Text>
          </TouchableOpacity>
        </View>

        {/* Error Alert */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Form Fields */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name / Business Name</Text>
            <View style={styles.inputContainer}>
              <User size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="John Doe / Green Bakery"
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

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
            <Text style={styles.label}>Phone Number (Optional)</Text>
            <View style={styles.inputContainer}>
              <Phone size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="+91 98765 43210"
                placeholderTextColor={Colors.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <Lock size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Minimum 6 characters"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.textInverse} />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Create Free Account</Text>
                <ArrowRight size={18} color={Colors.textInverse} />
              </>
            )}
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
    marginBottom: Spacing.lg,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryGlow,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
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
  roleSelection: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  roleCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: "center",
  },
  roleCardActive: {
    borderColor: Colors.primaryBright,
    backgroundColor: Colors.primaryLight,
  },
  roleCardActiveShop: {
    borderColor: Colors.amberBright,
    backgroundColor: Colors.amberLight,
  },
  roleTitle: {
    ...Typography.caption,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginTop: 6,
    marginBottom: 2,
    textAlign: "center",
  },
  roleTitleActive: {
    color: Colors.primaryBright,
  },
  roleDesc: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: "center",
  },
  errorBox: {
    backgroundColor: Colors.roseLight,
    borderColor: "rgba(244, 63, 94, 0.4)",
    borderWidth: 1,
    padding: Spacing.md,
    borderRadius: Radius.sm,
    marginBottom: Spacing.md,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.rose,
    fontWeight: "700",
  },
  form: {
    gap: Spacing.md,
  },
  inputGroup: {
    gap: 5,
  },
  label: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  input: {
    flex: 1,
    marginLeft: Spacing.sm,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    height: 50,
    borderRadius: Radius.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: Spacing.xs,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: Colors.textInverse,
    fontWeight: "800",
    fontSize: 15,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: Spacing.xs,
  },
  footerText: {
    ...Typography.body,
    fontSize: 13,
  },
  footerLink: {
    ...Typography.bodyBold,
    color: Colors.primaryBright,
    fontSize: 13,
  },
});
