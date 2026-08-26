import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as Location from "expo-location";
import {
  Store,
  MapPin,
  Phone,
  Navigation,
  Check,
  ShoppingBag,
  Info,
  LogOut,
} from "lucide-react-native";
import { Colors, Radius, Spacing, Typography } from "../../theme";
import { useAuth } from "../../contexts/AuthContext";
import { getMyShop, updateShop, createShop, ShopWithDescription } from "../../services/shops";

interface ShopSettingsScreenProps {
  navigation: any;
}

export const ShopSettingsScreen: React.FC<ShopSettingsScreenProps> = ({ navigation }) => {
  const { setRoleIntent, logout } = useAuth();
  const [shop, setShop] = useState<ShopWithDescription | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("28.6139");
  const [longitude, setLongitude] = useState("77.2090");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getMyShop();
        setShop(data);
        setName(data.name);
        setAddress(data.address);
        setLatitude(String(data.latitude));
        setLongitude(String(data.longitude));
        if (data.phone_number) setPhone(data.phone_number);
        if (data.description) setDescription(data.description);
      } catch {
        // Fallback for new shop setup
        setName("My Green Grocery & Bakery");
        setAddress("12 Market Street, Central");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleFetchGps = async () => {
    setGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        setLatitude(String(loc.coords.latitude));
        setLongitude(String(loc.coords.longitude));
        Alert.alert("GPS Updated", "Store coordinates updated from device location.");
      }
    } catch {
      Alert.alert("Location Error", "Could not fetch GPS coordinates.");
    } finally {
      setGettingLocation(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !address.trim()) {
      Alert.alert("Missing information", "Please fill in store name and address.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        address: address.trim(),
        latitude: parseFloat(latitude) || 28.6139,
        longitude: parseFloat(longitude) || 77.2090,
        phone_number: phone.trim() || undefined,
        description: description.trim() || undefined,
      };

      if (shop?.id) {
        await updateShop(shop.id, payload);
      } else {
        await createShop(payload);
      }
      Alert.alert("Success", "Store profile saved successfully!");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update store settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Store Settings & Location</Text>
        <Text style={styles.headerSub}>Manage your business profile and discovery GPS</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Switch back to Customer mode */}
        <TouchableOpacity
          style={styles.customerSwitchCard}
          onPress={() => setRoleIntent("customer")}
        >
          <View style={styles.customerSwitchLeft}>
            <ShoppingBag size={20} color={Colors.primary} />
            <View>
              <Text style={styles.customerSwitchTitle}>Switch to Shopper Mode</Text>
              <Text style={styles.customerSwitchSub}>Browse food rescues in other stores</Text>
            </View>
          </View>
        </TouchableOpacity>

        {loading ? (
          <View style={styles.loaderArea}>
            <ActivityIndicator color={Colors.amber} />
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Store / Bakery Name</Text>
              <View style={styles.inputContainer}>
                <Store size={18} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Green Organic Bakery"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Street Address</Text>
              <View style={styles.inputContainer}>
                <MapPin size={18} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="12 Market St, Near Metro Station"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>

            {/* GPS Location Button */}
            <View style={styles.gpsRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Latitude</Text>
                <TextInput
                  style={styles.gpsInput}
                  value={latitude}
                  onChangeText={setLatitude}
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Longitude</Text>
                <TextInput
                  style={styles.gpsInput}
                  value={longitude}
                  onChangeText={setLongitude}
                  keyboardType="numeric"
                />
              </View>

              <TouchableOpacity
                style={styles.gpsBtn}
                onPress={handleFetchGps}
                disabled={gettingLocation}
              >
                {gettingLocation ? (
                  <ActivityIndicator size="small" color={Colors.textInverse} />
                ) : (
                  <Navigation size={18} color={Colors.textInverse} />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Store Phone Number</Text>
              <View style={styles.inputContainer}>
                <Phone size={18} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+91 98765 43210"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Store Description</Text>
              <View style={[styles.inputContainer, { height: 80, alignItems: "flex-start", paddingTop: 8 }]}>
                <TextInput
                  style={[styles.input, { height: 64, textAlignVertical: "top" }]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Family-owned bakery crafting fresh artisanal bread and pastries every morning."
                  placeholderTextColor={Colors.textMuted}
                  multiline
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={Colors.textInverse} />
              ) : (
                <>
                  <Check size={18} color={Colors.textInverse} />
                  <Text style={styles.saveBtnText}>Save Store Profile</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Log Out Action Button */}
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={async () => {
                await logout();
              }}
              activeOpacity={0.85}
            >
              <LogOut size={18} color={Colors.rose} />
              <Text style={styles.logoutText}>Log Out of Store</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 50,
  },
  header: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  headerTitle: {
    ...Typography.title1,
    fontSize: 20,
  },
  headerSub: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 90,
  },
  customerSwitchCard: {
    backgroundColor: Colors.primaryLight,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primaryGlow,
    marginBottom: Spacing.md,
  },
  customerSwitchLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  customerSwitchTitle: {
    ...Typography.bodyBold,
    color: Colors.primary,
    fontSize: 14,
  },
  customerSwitchSub: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  loaderArea: {
    height: 160,
    justifyContent: "center",
    alignItems: "center",
  },
  form: {
    gap: Spacing.md,
  },
  inputGroup: {
    gap: 4,
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
  gpsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    alignItems: "flex-end",
  },
  gpsInput: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    color: Colors.textPrimary,
    fontSize: 13,
  },
  gpsBtn: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
    backgroundColor: Colors.amber,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn: {
    backgroundColor: Colors.amber,
    height: 50,
    borderRadius: Radius.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: Spacing.xs,
  },
  saveBtnText: {
    color: Colors.textInverse,
    fontWeight: "700",
    fontSize: 15,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.roseLight,
    paddingVertical: 14,
    borderRadius: Radius.md,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    marginTop: Spacing.md,
  },
  logoutText: {
    color: Colors.rose,
    fontWeight: "800",
    fontSize: 14,
  },
});
