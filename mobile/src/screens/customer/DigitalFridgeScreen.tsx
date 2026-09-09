import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  Sparkles,
  ChefHat,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Camera,
  Layers,
  X,
  Flame,
  ArrowRight,
  ScanLine,
} from "lucide-react-native";
import { Colors, Radius, Shadows, Spacing, Typography } from "../../theme";
import { CustomHeader } from "../../components/CustomHeader";
import { UniversalScannerModal } from "../../components/UniversalScannerModal";
import {
  getPantryItems,
  addPantryItem,
  updatePantryItem,
  deletePantryItem,
  getPantrySmartAlerts,
  generateRecipeFromFridge,
  type ApiPantryItem,
  type ApiPantrySmartAlert,
} from "../../services/pantry";
import type { ProductCategory, ApiRecipeResponse } from "../../types";

const CATEGORIES: ProductCategory[] = [
  "DAIRY" as ProductCategory,
  "BAKERY" as ProductCategory,
  "PRODUCE" as ProductCategory,
  "MEAT" as ProductCategory,
  "PANTRY" as ProductCategory,
  "PREPARED_FOOD" as ProductCategory,
  "OTHER" as ProductCategory,
];

export const DigitalFridgeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [items, setItems] = useState<ApiPantryItem[]>([]);
  const [alerts, setAlerts] = useState<ApiPantrySmartAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Scanner Modal
  const [scannerVisible, setScannerVisible] = useState(false);

  // Add Item Modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState<ProductCategory>("DAIRY" as ProductCategory);
  const [newItemQty, setNewItemQty] = useState("1 unit");
  const [newItemDays, setNewItemDays] = useState("3");
  const [savingItem, setSavingItem] = useState(false);

  // Recipe Modal
  const [recipeModalVisible, setRecipeModalVisible] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<ApiRecipeResponse | null>(null);
  const [generatingRecipe, setGeneratingRecipe] = useState(false);

  const loadFridgeData = useCallback(async () => {
    try {
      const [pantryList, smartAlerts] = await Promise.all([
        getPantryItems(),
        getPantrySmartAlerts().catch(() => []),
      ]);
      setItems(pantryList);
      setAlerts(smartAlerts);
    } catch (err) {
      console.log("Error loading fridge data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFridgeData();
    }, [loadFridgeData])
  );

  const handleAddItem = async () => {
    if (!newItemName.trim()) {
      Alert.alert("Required", "Please enter the item name.");
      return;
    }
    setSavingItem(true);
    try {
      const days = parseInt(newItemDays) || 3;
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + days);

      await addPantryItem({
        name: newItemName.trim(),
        category: newItemCategory,
        quantity: newItemQty.trim() || "1 unit",
        expiry_date: expDate.toISOString(),
      });

      setNewItemName("");
      setAddModalVisible(false);
      loadFridgeData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to add item to fridge.");
    } finally {
      setSavingItem(false);
    }
  };

  const handleMarkConsumed = async (item: ApiPantryItem) => {
    try {
      await updatePantryItem(item.id, { is_consumed: true });
      loadFridgeData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update item.");
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await deletePantryItem(itemId);
      loadFridgeData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to delete item.");
    }
  };

  const handleGenerateRecipe = async () => {
    if (items.length === 0) {
      Alert.alert("Fridge Empty", "Add some items or scan your kitchen to generate recipes!");
      return;
    }
    setGeneratingRecipe(true);
    try {
      const recipe = await generateRecipeFromFridge();
      setGeneratedRecipe(recipe);
      setRecipeModalVisible(true);
    } catch (err: any) {
      Alert.alert("AI Chef", err.message || "Could not generate recipe. Try adding more ingredients.");
    } finally {
      setGeneratingRecipe(false);
    }
  };

  const renderItem = ({ item }: { item: ApiPantryItem }) => {
    const isCritical = item.urgency_status === "CRITICAL";
    const isExpiringSoon = item.urgency_status === "EXPIRING_SOON";

    const urgencyColor = isCritical
      ? "#ef4444"
      : isExpiringSoon
      ? "#f59e0b"
      : "#10b981";

    return (
      <View style={[styles.itemCard, isCritical && styles.criticalCard]}>
        <View style={styles.cardHeader}>
          <View style={styles.nameRow}>
            <View style={[styles.urgencyDot, { backgroundColor: urgencyColor }]} />
            <Text style={styles.itemName} numberOfLines={1}>
              {item.name}
            </Text>
          </View>
          <View style={[styles.categoryBadge, { borderColor: urgencyColor }]}>
            <Text style={[styles.categoryText, { color: urgencyColor }]}>
              {item.category}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Clock size={14} color={urgencyColor} />
            <Text style={[styles.timeText, { color: urgencyColor }]}>
              {item.hours_left <= 0
                ? "Expired"
                : item.hours_left <= 24
                ? `Expires in ${Math.round(item.hours_left)} hours!`
                : `Expires in ${item.days_left} days`}
            </Text>
            <Text style={styles.qtyText}>• Qty: {item.quantity}</Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.consumeBtn}
            onPress={() => handleMarkConsumed(item)}
          >
            <CheckCircle2 size={16} color={Colors.primary} />
            <Text style={styles.consumeBtnText}>Mark Eaten</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDeleteItem(item.id)}
          >
            <Trash2 size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <CustomHeader
        title="🧊 My Digital Fridge"
        subtitle="AI Home Pantry & Expiry Tracker"
        showRoleToggle={false}
      />

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadFridgeData();
            }}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Smart AI Alert Banner */}
        {alerts.length > 0 && (
          <View style={styles.alertBanner}>
            <View style={styles.alertHeader}>
              <AlertTriangle size={18} color="#ef4444" />
              <Text style={styles.alertTitle}>
                {alerts.length} Item(s) Expiring in 24–48 Hours!
              </Text>
            </View>
            <Text style={styles.alertMsg}>
              {alerts[0].alert_message}
            </Text>
            <TouchableOpacity
              style={styles.alertActionBtn}
              onPress={handleGenerateRecipe}
              disabled={generatingRecipe}
            >
              <ChefHat size={16} color="#fff" />
              <Text style={styles.alertActionText}>
                {generatingRecipe ? "AI Chef Thinking..." : "Cook Zero-Waste Recipe"}
              </Text>
              <ArrowRight size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Action Cards */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => setScannerVisible(true)}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: "rgba(255, 91, 38, 0.15)" }]}>
              <ScanLine size={20} color={Colors.primary} />
            </View>
            <Text style={styles.actionLabel}>Scan Food</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => setAddModalVisible(true)}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: Colors.primaryLight }]}>
              <Plus size={20} color={Colors.primary} />
            </View>
            <Text style={styles.actionLabel}>Add Item</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={handleGenerateRecipe}
            disabled={generatingRecipe}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: "#fef3c7" }]}>
              <ChefHat size={20} color="#d97706" />
            </View>
            <Text style={styles.actionLabel}>
              {generatingRecipe ? "Cooking..." : "Recipe AI"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Inventory List Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Fridge & Pantry Inventory</Text>
          <Text style={styles.itemCountBadge}>{items.length} items</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : items.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>🧊</Text>
            <Text style={styles.emptyTitle}>Your Digital Fridge is Empty</Text>
            <Text style={styles.emptySubtitle}>
              Items you reserve on Meeva, scan from your kitchen, or add manually will automatically track their expiration timers here!
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: Colors.primary }]}
                onPress={() => setScannerVisible(true)}
              >
                <ScanLine size={18} color="#fff" />
                <Text style={styles.emptyBtnText}>Scan Food</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: Colors.cardSurface, borderWidth: 1, borderColor: Colors.cardBorder }]}
                onPress={() => setAddModalVisible(true)}
              >
                <Plus size={18} color={Colors.textPrimary} />
                <Text style={[styles.emptyBtnText, { color: Colors.textPrimary }]}>Manual Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          items.map((item) => (
            <View key={item.id}>
              {renderItem({ item })}
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Item Modal */}
      <Modal visible={addModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add to Digital Fridge</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <X size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Item Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Organic Milk, Brown Bread, Paneer"
              placeholderTextColor={Colors.textMuted}
              value={newItemName}
              onChangeText={setNewItemName}
            />

            <Text style={styles.inputLabel}>Quantity</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., 1 Litre, 2 Loaves, 500g"
              placeholderTextColor={Colors.textMuted}
              value={newItemQty}
              onChangeText={setNewItemQty}
            />

            <Text style={styles.inputLabel}>Days until Expiry</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., 2, 3, 5"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              value={newItemDays}
              onChangeText={setNewItemDays}
            />

            <Text style={styles.inputLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catChip,
                    newItemCategory === cat && styles.catChipActive,
                  ]}
                  onPress={() => setNewItemCategory(cat)}
                >
                  <Text
                    style={[
                      styles.catChipText,
                      newItemCategory === cat && styles.catChipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleAddItem}
              disabled={savingItem}
            >
              <Text style={styles.saveBtnText}>
                {savingItem ? "Saving..." : "Save to Fridge"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* AI Recipe Modal */}
      <Modal visible={recipeModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "85%" }]}>
            <View style={styles.modalHeader}>
              <View style={styles.nameRow}>
                <Sparkles size={20} color={Colors.primary} />
                <Text style={styles.modalTitle}>AI Fridge Recipe</Text>
              </View>
              <TouchableOpacity onPress={() => setRecipeModalVisible(false)}>
                <X size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {generatedRecipe && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.recipeTitle}>{generatedRecipe.recipe_name}</Text>
                <Text style={styles.recipeDesc}>{generatedRecipe.description}</Text>

                <View style={styles.recipeMetaRow}>
                  <Text style={styles.recipeMetaBadge}>⏱️ Prep: {generatedRecipe.prep_time}</Text>
                  <Text style={styles.recipeMetaBadge}>🍳 Cook: {generatedRecipe.cook_time}</Text>
                  <Text style={styles.recipeMetaBadge}>⭐ {generatedRecipe.difficulty}</Text>
                </View>

                <Text style={styles.subHeading}>Ingredients Used:</Text>
                {generatedRecipe.ingredients.map((ing, idx) => (
                  <View key={idx} style={styles.ingRow}>
                    <Text style={styles.ingDot}>•</Text>
                    <Text style={styles.ingName}>{ing.name}</Text>
                    <Text style={styles.ingQty}>{ing.quantity}</Text>
                  </View>
                ))}

                <Text style={styles.subHeading}>Step-by-Step Instructions:</Text>
                {generatedRecipe.instructions.map((step) => (
                  <View key={step.step_number} style={styles.stepRow}>
                    <View style={styles.stepNumBadge}>
                      <Text style={styles.stepNumText}>{step.step_number}</Text>
                    </View>
                    <Text style={styles.stepText}>{step.instruction}</Text>
                  </View>
                ))}

                <View style={styles.wasteImpactBox}>
                  <Text style={styles.wasteImpactText}>
                    🌱 {generatedRecipe.waste_saved_summary}
                  </Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Universal Scanner Modal for Fridge Quick Scan */}
      <UniversalScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        initialMode="fridge_log"
        onItemAddedToFridge={() => loadFridgeData()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  headerBtn: {
    padding: 8,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
  },
  alertBanner: {
    backgroundColor: "#fef2f2",
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#b91c1c",
  },
  alertMsg: {
    fontSize: 13,
    color: "#7f1d1d",
    lineHeight: 18,
    marginBottom: 10,
  },
  alertActionBtn: {
    backgroundColor: "#ef4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    gap: 8,
  },
  alertActionText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: Spacing.md,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    ...Shadows.card,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  itemCountBadge: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textMuted,
    backgroundColor: Colors.card,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  itemCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    ...Shadows.card,
  },
  criticalCard: {
    borderColor: "#fca5a5",
    backgroundColor: "#fffafa",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  urgencyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "700",
  },
  cardBody: {
    marginTop: 6,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeText: {
    fontSize: 13,
    fontWeight: "700",
  },
  qtyText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  consumeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  consumeBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },
  deleteBtn: {
    padding: 4,
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyBtn: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  emptyBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textMuted,
    marginBottom: 4,
    marginTop: 8,
    textTransform: "uppercase",
  },
  textInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  catScroll: {
    flexDirection: "row",
    marginVertical: 8,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.background,
    marginRight: 8,
  },
  catChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  catChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  catChipTextActive: {
    color: "#fff",
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: Radius.md,
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  recipeTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginTop: 6,
  },
  recipeDesc: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  recipeMetaRow: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 12,
  },
  recipeMetaBadge: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.md,
  },
  subHeading: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginTop: 14,
    marginBottom: 6,
  },
  ingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 2,
  },
  ingDot: {
    color: Colors.primary,
    fontWeight: "700",
  },
  ingName: {
    fontSize: 13,
    color: Colors.textPrimary,
    flex: 1,
  },
  ingQty: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  stepRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  stepNumBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  stepText: {
    fontSize: 13,
    color: Colors.textPrimary,
    flex: 1,
    lineHeight: 18,
  },
  wasteImpactBox: {
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginTop: 14,
    marginBottom: 20,
  },
  wasteImpactText: {
    color: "#065f46",
    fontSize: 13,
    fontWeight: "600",
  },
});
