import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  ArrowLeft,
  Camera,
  Barcode,
  Sparkles,
  Upload,
  Calendar,
  DollarSign,
  Tag,
  Package,
  Brain,
  Check,
} from "lucide-react-native";
import { Colors, Radius, Spacing, Typography } from "../../theme";
import { CameraScannerModal } from "../../components/CameraScannerModal";
import {
  createProduct,
  updateProduct,
  optimizeProductDetails,
  uploadImageNative,
  scanProductDatesNative,
} from "../../services/products";
import { useAuth } from "../../contexts/AuthContext";
import type { ApiProduct, ProductCategory } from "../../types";

const CATEGORIES: { label: string; value: ProductCategory }[] = [
  { label: "Bakery", value: "BAKERY" },
  { label: "Dairy", value: "DAIRY" },
  { label: "Produce", value: "PRODUCE" },
  { label: "Meat", value: "MEAT" },
  { label: "Pantry", value: "PANTRY" },
  { label: "Prepared Meals", value: "PREPARED_FOOD" },
  { label: "Other", value: "OTHER" },
];

interface AddEditProductScreenProps {
  route: any;
  navigation: any;
}

export const AddEditProductScreen: React.FC<AddEditProductScreenProps> = ({
  route,
  navigation,
}) => {
  const { logout } = useAuth();
  const existingProduct: ApiProduct | undefined = route.params?.product;
  const isEditing = !!existingProduct;

  const [name, setName] = useState(existingProduct?.name || "");
  const [category, setCategory] = useState<ProductCategory>(
    existingProduct?.category || "BAKERY"
  );
  const [originalPrice, setOriginalPrice] = useState(
    existingProduct?.original_price ? String(existingProduct.original_price) : ""
  );
  const [discountPrice, setDiscountPrice] = useState(
    existingProduct?.discount_price ? String(existingProduct.discount_price) : ""
  );
  const [quantity, setQuantity] = useState(
    existingProduct?.quantity ? String(existingProduct.quantity) : "1"
  );
  const [mfgDate, setMfgDate] = useState(
    existingProduct?.manufacturing_date ||
      new Date(Date.now() - 3600000 * 48).toISOString().split("T")[0]
  );
  const [expiryDate, setExpiryDate] = useState(
    existingProduct?.expiry_date ||
      new Date(Date.now() + 3600000 * 24).toISOString().split("T")[0]
  );
  const [description, setDescription] = useState(existingProduct?.description || "");
  const [imageUri, setImageUri] = useState<string | null>(
    existingProduct?.front_image_url || null
  );
  const [autoDiscountEnabled, setAutoDiscountEnabled] = useState(
    existingProduct?.auto_discount_enabled || false
  );

  // Scanner modal state
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scannerMode, setScannerMode] = useState<"ocr_dates" | "barcode">("ocr_dates");

  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission Required", "Please grant photo library permission to upload product photos.");
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!res.canceled && res.assets && res.assets[0]?.uri) {
        const uri = res.assets[0].uri;
        setImageUri(uri);
        Alert.alert(
          "Scan Product Dates?",
          "Would you like ExpiryGo AI to scan this image for manufacturing and expiry dates?",
          [
            { text: "No, Just Use Photo", style: "cancel" },
            {
              text: "Scan Dates",
              onPress: async () => {
                setLoading(true);
                try {
                  const result = await scanProductDatesNative(uri);
                  if (result.manufacturing_date) setMfgDate(result.manufacturing_date);
                  if (result.expiry_date) setExpiryDate(result.expiry_date);
                  Alert.alert(
                    "Dates Extracted",
                    `MFG: ${result.manufacturing_date || "Not detected"}\nEXP: ${result.expiry_date || "Not detected"}`
                  );
                } catch {
                  Alert.alert("OCR Notice", "Could not clearly detect date text. Please set dates manually.");
                } finally {
                  setLoading(false);
                }
              },
            },
          ]
        );
      }
    } catch (err) {
      console.log("Image selection error:", err);
      Alert.alert("Error", "Failed to select image from gallery.");
    }
  };

  const handleOptimizeWithAi = async () => {
    if (!name || !originalPrice) {
      Alert.alert("Missing details", "Please enter product name and original price first.");
      return;
    }
    setOptimizing(true);
    try {
      const res = await optimizeProductDetails({
        name,
        mfg_date: mfgDate,
        expiry_date: expiryDate,
        original_price: parseFloat(originalPrice),
        quantity: parseInt(quantity, 10) || 1,
      });

      if (res.suggested_description) {
        setDescription(res.suggested_description);
      }
      if (res.suggested_discount_percent) {
        const orig = parseFloat(originalPrice);
        const disc = orig * (1 - res.suggested_discount_percent / 100);
        setDiscountPrice(disc.toFixed(0));
      }
      Alert.alert("AI Optimization Applied", `Calculated ${res.suggested_discount_percent}% optimal surplus markdown!`);
    } catch (err: any) {
      // Fallback client side heuristic
      const orig = parseFloat(originalPrice) || 100;
      setDiscountPrice((orig * 0.5).toFixed(0));
      setDescription(`Delicious surplus ${name} rescued fresh at discounted price.`);
    } finally {
      setOptimizing(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !originalPrice || !expiryDate) {
      setError("Please fill in name, original price, and expiry date.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      let finalImageUrl = imageUri || "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=600";

      if (imageUri && imageUri.startsWith("file://")) {
        try {
          finalImageUrl = await uploadImageNative(imageUri);
        } catch {
          // Fallback to default
        }
      }

      const origPriceNum = parseFloat(originalPrice);
      const discPriceNum = discountPrice ? parseFloat(discountPrice) : origPriceNum;

      const payload = {
        name: name.trim(),
        original_price: origPriceNum,
        discount_price: discPriceNum,
        quantity: parseInt(quantity, 10) || 1,
        manufacturing_date: mfgDate,
        expiry_date: expiryDate,
        category,
        front_image_url: finalImageUrl,
        expiry_image_url: finalImageUrl,
        voice_note_url: null,
        description: description.trim() || null,
        is_surprise_bag: false,
        auto_discount_enabled: autoDiscountEnabled,
        auto_discount_min_price: autoDiscountEnabled ? Math.round(discPriceNum * 0.7) : discPriceNum,
      };

      if (existingProduct) {
        await updateProduct(existingProduct.id, payload);
        Alert.alert("Success", "Product deal updated successfully!");
      } else {
        await createProduct(payload);
        Alert.alert("Success", "Surplus deal posted live!");
      }
      if (navigation && typeof navigation.canGoBack === "function" && navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate("ShopDashboard");
      }
    } catch (err: any) {
      setError(err.message || "Failed to save deal. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const origPriceNum = parseFloat(originalPrice) || 0;
  const discPriceNum = discountPrice ? parseFloat(discountPrice) : origPriceNum;
  const calculatedDiscountPct =
    origPriceNum > 0 && discPriceNum < origPriceNum
      ? Math.round(((origPriceNum - discPriceNum) / origPriceNum) * 100)
      : 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (navigation && typeof navigation.canGoBack === "function" && navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate("ShopDashboard");
            }
          }}
        >
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {existingProduct ? "Edit Surplus Deal" : "List New Surplus Deal"}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* AI Camera Quick Scan Tools */}
        <View style={styles.scannerTools}>
          <TouchableOpacity
            style={styles.scannerBtn}
            onPress={() => {
              setScannerMode("ocr_dates");
              setScannerVisible(true);
            }}
          >
            <Camera size={18} color={Colors.primary} />
            <Text style={styles.scannerBtnText}>AI OCR Date Scan</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.scannerBtn, styles.scannerBtnBarcode]}
            onPress={() => {
              setScannerMode("barcode");
              setScannerVisible(true);
            }}
          >
            <Barcode size={18} color={Colors.amber} />
            <Text style={[styles.scannerBtnText, { color: Colors.amber }]}>Scan Barcode</Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            {(error.toLowerCase().includes("token") || error.toLowerCase().includes("authenticated")) && (
              <TouchableOpacity
                style={styles.reloginBtn}
                onPress={async () => {
                  await logout();
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.reloginBtnText}>🔑 Tap here to Sign In Again</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Product Photo Uploader */}
        <TouchableOpacity style={styles.imagePickerBox} onPress={handlePickImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.pickedImage} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Upload size={24} color={Colors.textMuted} />
              <Text style={styles.imagePlaceholderText}>Upload Product Photo</Text>
              <Text style={styles.imagePlaceholderSub}>Tap to choose from camera / gallery</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Form Fields */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Product Item Name</Text>
            <View style={styles.inputContainer}>
              <Tag size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="e.g. Sourdough Loaf / Fresh Milk 1L"
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          {/* Category Selector Chips */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[styles.catChip, category === cat.value && styles.catChipActive]}
                  onPress={() => setCategory(cat.value)}
                >
                  <Text style={[styles.catChipText, category === cat.value && styles.catChipTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Pricing & Stock Row */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Original Price (₹)</Text>
              <View style={styles.inputContainer}>
                <DollarSign size={16} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="100"
                  placeholderTextColor={Colors.textMuted}
                  value={originalPrice}
                  onChangeText={setOriginalPrice}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Discount Price (₹)</Text>
              <View style={styles.inputContainer}>
                <DollarSign size={16} color={Colors.primary} />
                <TextInput
                  style={[styles.input, { color: Colors.primary, fontWeight: "700" }]}
                  placeholder="50"
                  placeholderTextColor={Colors.textMuted}
                  value={discountPrice}
                  onChangeText={setDiscountPrice}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={[styles.inputGroup, { width: 70 }]}>
              <Text style={styles.label}>Qty</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, { textAlign: "center", marginLeft: 0 }]}
                  placeholder="1"
                  placeholderTextColor={Colors.textMuted}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Deal Price Summary Badge */}
          {origPriceNum > 0 && (
            <View style={styles.priceSummaryBadge}>
              <Text style={styles.priceSummaryText}>
                Selling Price: <Text style={{ color: Colors.primary, fontWeight: "800" }}>₹{discPriceNum}</Text>
                {calculatedDiscountPct > 0 ? ` (${calculatedDiscountPct}% OFF MRP ₹${origPriceNum})` : " (Full Price)"}
              </Text>
            </View>
          )}

          {/* Pricing Mode Toggle */}
          <View style={styles.pricingStrategyContainer}>
            <Text style={styles.label}>Pricing Strategy</Text>
            <View style={styles.strategyRow}>
              <TouchableOpacity
                style={[styles.strategyCard, !autoDiscountEnabled && styles.strategyCardActive]}
                onPress={() => setAutoDiscountEnabled(false)}
                activeOpacity={0.85}
              >
                <View style={styles.strategyHeader}>
                  <Text style={[styles.strategyTitle, !autoDiscountEnabled && { color: Colors.primary }]}>
                    🔒 Fixed Deal Price
                  </Text>
                  {!autoDiscountEnabled && <Check size={14} color={Colors.primary} />}
                </View>
                <Text style={styles.strategySub}>
                  Sells at exactly ₹{discPriceNum || "50"}. No automatic decreases.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.strategyCard, autoDiscountEnabled && styles.strategyCardActive]}
                onPress={() => setAutoDiscountEnabled(true)}
                activeOpacity={0.85}
              >
                <View style={styles.strategyHeader}>
                  <Text style={[styles.strategyTitle, autoDiscountEnabled && { color: Colors.amber }]}>
                    ⚡ Dynamic Clearance
                  </Text>
                  {autoDiscountEnabled && <Check size={14} color={Colors.amber} />}
                </View>
                <Text style={styles.strategySub}>
                  Gradually lowers price in the last 24h of expiry to clear stock.
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* AI Auto-Price Suggestion Trigger */}
          <TouchableOpacity
            style={styles.aiOptimizeBtn}
            onPress={handleOptimizeWithAi}
            disabled={optimizing}
          >
            <Sparkles size={16} color={Colors.purple} />
            <Text style={styles.aiOptimizeText}>
              {optimizing ? "Calculating Smart Suggested Price..." : "AI Auto-Price & Description Suggestion"}
            </Text>
          </TouchableOpacity>

          {/* Dates */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Mfg. Date (YYYY-MM-DD)</Text>
              <View style={styles.inputContainer}>
                <Calendar size={16} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  value={mfgDate}
                  onChangeText={setMfgDate}
                  placeholder="2026-08-20"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Expiry Date (YYYY-MM-DD)</Text>
              <View style={[styles.inputContainer, { borderColor: Colors.amber }]}>
                <Calendar size={16} color={Colors.amber} />
                <TextInput
                  style={[styles.input, { color: Colors.amber }]}
                  value={expiryDate}
                  onChangeText={setExpiryDate}
                  placeholder="2026-08-25"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description & Ingredients (Optional)</Text>
            <View style={[styles.inputContainer, { height: 80, alignItems: "flex-start", paddingTop: 8 }]}>
              <TextInput
                style={[styles.input, { height: 64, textAlignVertical: "top" }]}
                placeholder="Freshly baked artisan bread made today morning. Best consumed within 24h."
                placeholderTextColor={Colors.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
              />
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.saveBtn, loading && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.textInverse} />
            ) : (
              <>
                <Check size={18} color={Colors.textInverse} />
                <Text style={styles.saveBtnText}>
                  {existingProduct ? "Update Deal" : "Publish Surplus Deal"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Native Camera Scanner Modal */}
      <CameraScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        mode={scannerMode}
        onDatesDetected={(dates) => {
          if (dates.mfg) setMfgDate(dates.mfg);
          if (dates.expiry) setExpiryDate(dates.expiry);
          Alert.alert("Dates Detected", `Expiry Date set to: ${dates.expiry || "Detected"}`);
        }}
        onBarcodeDetected={(data) => {
          if (data.name) setName(data.name);
          if (data.category) setCategory(data.category as ProductCategory);
          Alert.alert("Barcode Scanned", `Found product: ${data.name || data.barcode}`);
        }}
      />
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  backBtn: {
    padding: 8,
    borderRadius: Radius.sm,
    backgroundColor: Colors.cardElevated,
  },
  headerTitle: {
    ...Typography.title1,
    fontSize: 18,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 40,
  },
  scannerTools: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  scannerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primaryLight,
    paddingVertical: 12,
    borderRadius: Radius.sm,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.primaryGlow,
  },
  scannerBtnBarcode: {
    backgroundColor: Colors.amberLight,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  scannerBtnText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: "700",
  },
  errorBox: {
    backgroundColor: Colors.roseLight,
    borderColor: "rgba(239, 68, 68, 0.4)",
    borderWidth: 1,
    padding: Spacing.md,
    borderRadius: Radius.sm,
    marginBottom: Spacing.md,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.rose,
    fontWeight: "600",
  },
  imagePickerBox: {
    width: "100%",
    height: 160,
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderStyle: "dashed",
    overflow: "hidden",
    marginBottom: Spacing.md,
  },
  pickedImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  imagePlaceholderText: {
    ...Typography.bodyBold,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  imagePlaceholderSub: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontSize: 11,
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
  categoryRow: {
    gap: Spacing.sm,
    paddingVertical: 2,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  catChipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  catChipText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  catChipTextActive: {
    color: Colors.primary,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  priceSummaryBadge: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryGlow,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.sm,
  },
  priceSummaryText: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  pricingStrategyContainer: {
    gap: 6,
  },
  strategyRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  strategyCard: {
    flex: 1,
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: Radius.sm,
    padding: 10,
  },
  strategyCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  strategyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  strategyTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  strategySub: {
    fontSize: 10,
    color: Colors.textMuted,
    lineHeight: 14,
  },
  aiOptimizeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.purpleLight,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.3)",
    gap: 6,
  },
  aiOptimizeText: {
    ...Typography.caption,
    color: Colors.purple,
    fontWeight: "700",
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    height: 50,
    borderRadius: Radius.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: Spacing.sm,
  },
  saveBtnText: {
    color: Colors.textInverse,
    fontWeight: "700",
    fontSize: 15,
  },
  reloginBtn: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  reloginBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
