import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  ArrowLeft,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  Sparkles,
  MapPin,
  Phone,
  User,
  Smartphone,
  Banknote,
  ShieldCheck,
} from "lucide-react-native";
import { Colors, Radius, Shadows, Spacing, Typography } from "../../theme";
import { useAuth } from "../../contexts/AuthContext";
import { createOrder } from "../../services/orders";
import type { ApiProduct } from "../../types";

interface CheckoutScreenProps {
  route: any;
  navigation: any;
}

export const CheckoutScreen: React.FC<CheckoutScreenProps> = ({ route, navigation }) => {
  const { product, quantity: initialQty = 1 } = (route.params || {}) as {
    product?: ApiProduct;
    quantity?: number;
  };
  const { user } = useAuth();

  const [currentQty, setCurrentQty] = useState(initialQty);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "COD">("UPI");
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone_number || "");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState(false);

  if (!product) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No item selected for checkout.</Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => {
            if (navigation && typeof navigation.canGoBack === "function" && navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate("DealsTab");
            }
          }}
        >
          <Text style={styles.primaryBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const price = product.current_price ?? product.discount_price ?? 0;
  const rawSubtotal = price * currentQty;

  // Quantity-based bulk surplus discount:
  // - 2-3 units: 5% extra bulk discount
  // - 4+ units: 10% extra bulk discount
  const quantityDiscountPct = currentQty >= 4 ? 10 : currentQty >= 2 ? 5 : 0;
  const quantityDiscountSaved = (rawSubtotal * quantityDiscountPct) / 100;
  const subtotal = rawSubtotal - quantityDiscountSaved;

  const deliveryFee = 35.0;
  const discountSaved = promoApplied ? subtotal * 0.1 : 0.0;
  const total = Math.max(0, subtotal + deliveryFee - discountSaved);
  const totalMrpSavings = Math.max(0, (product.original_price * currentQty) - (total - deliveryFee));

  const defaultImage =
    "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600";
  const displayImage = product.front_image_url || defaultImage;

  const handleApplyPromo = () => {
    if (promoCode.trim().toUpperCase() === "ZERO50" || promoCode.trim().toUpperCase() === "EXPIRYGO" || promoCode.trim().length >= 3) {
      setPromoApplied(true);
      setError(null);
    } else {
      setError("Please enter a valid coupon code (e.g. ZERO50)");
    }
  };

  const handlePlaceOrder = async () => {
    if (!name.trim() || !phone.trim() || !address.trim()) {
      setError("Please complete your delivery name, phone, and address.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await createOrder({
        product_id: product.id,
        order_type: "DELIVERY",
        quantity: currentQty,
        delivery_fee: deliveryFee,
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        delivery_address: address.trim(),
      });
      setOrderSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to place delivery order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Top Bar */}
      <View style={styles.topNav}>
        <TouchableOpacity
          style={styles.navCircle}
          onPress={() => {
            if (navigation && typeof navigation.canGoBack === "function" && navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate("DealsTab");
            }
          }}
        >
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.navTitle}>Check out</Text>

        <View style={styles.navCircle}>
          <ShoppingBag size={18} color={Colors.textPrimary} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {orderSuccess ? (
          <View style={styles.successCard}>
            <CheckCircle2 size={56} color={Colors.primary} />
            <Text style={styles.successTitle}>Order Placed Successfully!</Text>
            <Text style={styles.successSub}>
              Your surplus food is on its way from {product.shop?.name || "the local partner store"}.
            </Text>

            <TouchableOpacity
              style={styles.fullActionBtn}
              onPress={() => navigation.navigate("DealsTab")}
              activeOpacity={0.88}
            >
              <Text style={styles.fullActionBtnText}>Back to Surplus Deals</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Cart Item Card */}
            <View style={styles.itemCard}>
              <View style={styles.itemImageContainer}>
                <Image source={{ uri: displayImage }} style={styles.itemImage} resizeMode="cover" />
              </View>

              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {product.name}
                </Text>
                <Text style={styles.itemCategory}>{product.category}</Text>
                <Text style={styles.itemPrice}>₹{price.toFixed(2)}</Text>
              </View>

              <View style={styles.stepperCol}>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => {
                    if (navigation && typeof navigation.canGoBack === "function" && navigation.canGoBack()) {
                      navigation.goBack();
                    } else {
                      navigation.navigate("DealsTab");
                    }
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Trash2 size={16} color={Colors.textMuted} />
                </TouchableOpacity>

                <View style={styles.miniStepper}>
                  <TouchableOpacity
                    style={styles.miniStepBtn}
                    onPress={() => setCurrentQty(Math.max(1, currentQty - 1))}
                  >
                    <Minus size={12} color={Colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.miniStepQty}>{currentQty}</Text>
                  <TouchableOpacity
                    style={styles.miniStepBtn}
                    onPress={() => setCurrentQty(Math.min(product.quantity, currentQty + 1))}
                  >
                    <Plus size={12} color={Colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Delivery Details Form */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Delivery Details</Text>

              <View style={styles.inputGroup}>
                <User size={16} color={Colors.textMuted} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Full Name"
                  placeholderTextColor={Colors.textMuted}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Phone size={16} color={Colors.textMuted} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Phone Number (+91)"
                  placeholderTextColor={Colors.textMuted}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <MapPin size={16} color={Colors.textMuted} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Complete Delivery Address & Flat No"
                  placeholderTextColor={Colors.textMuted}
                  value={address}
                  onChangeText={setAddress}
                />
              </View>
            </View>

            {/* Promo Code Input */}
            <View style={styles.promoContainer}>
              <TextInput
                style={styles.promoInput}
                placeholder="Promo Code (e.g. ZERO50)"
                placeholderTextColor={Colors.textMuted}
                value={promoCode}
                onChangeText={setPromoCode}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={[styles.promoApplyBtn, promoApplied && styles.promoAppliedBtn]}
                onPress={handleApplyPromo}
                activeOpacity={0.8}
              >
                <Text style={styles.promoApplyText}>{promoApplied ? "Applied ✓" : "Apply"}</Text>
              </TouchableOpacity>
            </View>

            {/* Payment Method Selector */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Payment Method</Text>
              
              <View style={styles.paymentMethodRow}>
                <TouchableOpacity
                  style={[
                    styles.paymentMethodBtn,
                    paymentMethod === "UPI" && styles.paymentMethodBtnActive,
                  ]}
                  onPress={() => setPaymentMethod("UPI")}
                  activeOpacity={0.85}
                >
                  <Smartphone
                    size={20}
                    color={paymentMethod === "UPI" ? Colors.primary : Colors.textMuted}
                  />
                  <View>
                    <Text
                      style={[
                        styles.paymentMethodTitle,
                        paymentMethod === "UPI" && styles.paymentMethodTitleActive,
                      ]}
                    >
                      UPI Payment
                    </Text>
                    <Text style={styles.paymentMethodSub}>GPay / PhonePe / Paytm</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentMethodBtn,
                    paymentMethod === "COD" && styles.paymentMethodBtnActive,
                  ]}
                  onPress={() => setPaymentMethod("COD")}
                  activeOpacity={0.85}
                >
                  <Banknote
                    size={20}
                    color={paymentMethod === "COD" ? Colors.primary : Colors.textMuted}
                  />
                  <View>
                    <Text
                      style={[
                        styles.paymentMethodTitle,
                        paymentMethod === "COD" && styles.paymentMethodTitleActive,
                      ]}
                    >
                      Pay on Delivery
                    </Text>
                    <Text style={styles.paymentMethodSub}>Cash / QR at doorstep</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Price Summary Breakdown */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  Items Subtotal ({currentQty} {currentQty > 1 ? "items" : "item"})
                </Text>
                <Text style={styles.summaryVal}>₹{rawSubtotal.toFixed(2)}</Text>
              </View>

              {quantityDiscountSaved > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: Colors.primary, fontWeight: "700" }]}>
                    Bulk Quantity Discount ({quantityDiscountPct}%)
                  </Text>
                  <Text style={[styles.summaryVal, { color: Colors.primary, fontWeight: "700" }]}>
                    -₹{quantityDiscountSaved.toFixed(2)}
                  </Text>
                </View>
              )}

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery Fee</Text>
                <Text style={styles.summaryVal}>₹{deliveryFee.toFixed(2)}</Text>
              </View>

              {promoApplied && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: Colors.primary }]}>Promo Code (10%)</Text>
                  <Text style={[styles.summaryVal, { color: Colors.primary }]}>
                    -₹{discountSaved.toFixed(2)}
                  </Text>
                </View>
              )}

              <View style={styles.divider} />

              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total Payable</Text>
                <Text style={styles.totalVal}>₹{total.toFixed(2)}</Text>
              </View>

              {totalMrpSavings > 0 && (
                <View style={styles.savingsTag}>
                  <Sparkles size={12} color="#16A34A" />
                  <Text style={styles.savingsTagText}>
                    You saved ₹{totalMrpSavings.toFixed(2)} on this order!
                  </Text>
                </View>
              )}
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>{error}</Text>
              </View>
            )}

            {/* Giant Proceed to Checkout Orange Button */}
            <TouchableOpacity
              style={styles.fullActionBtn}
              onPress={handlePlaceOrder}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.fullActionBtnText}>Proceed to Checkout</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
    backgroundColor: Colors.background,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: Radius.full,
  },
  primaryBtnText: {
    color: "#FFF",
    fontWeight: "700",
  },
  topNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingTop: 12,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
  },
  navCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.soft,
  },
  navTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 40,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    ...Shadows.soft,
  },
  itemImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 16,
    backgroundColor: Colors.cardSurface,
    overflow: "hidden",
  },
  itemImage: {
    width: "100%",
    height: "100%",
  },
  itemInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: "center",
  },
  itemName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  itemCategory: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 6,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.primary,
  },
  stepperCol: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 70,
  },
  deleteBtn: {
    padding: 2,
  },
  miniStepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.cardSurface,
    borderRadius: Radius.full,
    padding: 3,
  },
  miniStepBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.soft,
  },
  miniStepQty: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textPrimary,
    paddingHorizontal: 8,
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    ...Shadows.soft,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.cardSurface,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 10,
  },
  textInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  promoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: Radius.full,
    paddingLeft: Spacing.md,
    paddingRight: 6,
    height: 52,
    marginVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    ...Shadows.soft,
  },
  promoInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  promoApplyBtn: {
    backgroundColor: "#FCE7DB",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Radius.full,
  },
  promoAppliedBtn: {
    backgroundColor: Colors.primary,
  },
  promoApplyText: {
    color: Colors.primary,
    fontWeight: "800",
    fontSize: 13,
  },
  paymentMethodRow: {
    gap: 10,
    marginTop: 6,
  },
  paymentMethodBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  paymentMethodBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  paymentMethodTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  paymentMethodTitleActive: {
    color: Colors.primary,
  },
  paymentMethodSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    ...Shadows.soft,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  summaryVal: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.cardBorder,
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  totalVal: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.textPrimary,
  },
  savingsTag: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F0FDF4",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radius.sm,
    marginTop: 8,
  },
  savingsTagText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#16A34A",
  },
  errorBox: {
    backgroundColor: Colors.roseLight,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginVertical: Spacing.sm,
  },
  errorBoxText: {
    color: Colors.rose,
    fontSize: 13,
    fontWeight: "600",
  },
  fullActionBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.md,
    ...Shadows.hover,
  },
  fullActionBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  successCard: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: Spacing.xl,
    alignItems: "center",
    marginTop: Spacing.xl,
    ...Shadows.soft,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    marginBottom: 6,
    textAlign: "center",
  },
  successSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: Spacing.lg,
  },
});
