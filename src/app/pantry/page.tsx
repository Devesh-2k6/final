"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  ChefHat,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  X,
  ArrowRight,
  Refrigerator,
} from "lucide-react";
import {
  getPantryItems,
  addPantryItem,
  updatePantryItem,
  deletePantryItem,
  getPantrySmartAlerts,
  generateRecipeFromFridge,
  type ApiPantryItem,
  type ApiPantrySmartAlert,
} from "@/services/pantry";
import { ShopperLayout } from "@/components/layout/ShopperLayout";
import type { ProductCategory } from "@/types/product";
import type { ApiRecipeResponse, RecipeIngredientItem, RecipeStep } from "@/types/recipe";


const CATEGORIES: ProductCategory[] = [
  "DAIRY" as ProductCategory,
  "BAKERY" as ProductCategory,
  "PRODUCE" as ProductCategory,
  "MEAT" as ProductCategory,
  "PANTRY" as ProductCategory,
  "PREPARED_FOOD" as ProductCategory,
  "OTHER" as ProductCategory,
];

export default function PantryPage() {
  const [items, setItems] = useState<ApiPantryItem[]>([]);
  const [alerts, setAlerts] = useState<ApiPantrySmartAlert[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Item Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ProductCategory>("DAIRY" as ProductCategory);
  const [quantity, setQuantity] = useState("1 unit");
  const [daysLeft, setDaysLeft] = useState("3");
  const [saving, setSaving] = useState(false);

  // Recipe Modal
  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [recipe, setRecipe] = useState<ApiRecipeResponse | null>(null);
  const [cooking, setCooking] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [list, smartAlerts] = await Promise.all([
        getPantryItems(),
        getPantrySmartAlerts().catch(() => []),
      ]);
      setItems(list);
      setAlerts(smartAlerts);
    } catch (e) {
      console.error("Error loading fridge items:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const days = parseInt(daysLeft) || 3;
      const exp = new Date();
      exp.setDate(exp.getDate() + days);

      await addPantryItem({
        name: name.trim(),
        category,
        quantity: quantity.trim() || "1 unit",
        expiry_date: exp.toISOString(),
      });

      setName("");
      setAddModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to add item");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkConsumed = async (item: ApiPantryItem) => {
    try {
      await updatePantryItem(item.id, { is_consumed: true });
      loadData();
    } catch (e: any) {
      alert(e.message || "Failed to update item");
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      await deletePantryItem(itemId);
      loadData();
    } catch (e: any) {
      alert(e.message || "Failed to delete item");
    }
  };

  const handleGenerateRecipe = async () => {
    if (items.length === 0) {
      alert("Your Digital Fridge is empty! Add items to generate zero-waste recipes.");
      return;
    }
    setCooking(true);
    try {
      const res = await generateRecipeFromFridge();
      setRecipe(res);
      setRecipeModalOpen(true);
    } catch (e: any) {
      alert(e.message || "Failed to synthesize recipe");
    } finally {
      setCooking(false);
    }
  };

  return (
    <ShopperLayout>
      <div className="min-h-screen bg-slate-950 text-slate-50 pb-28 pt-6 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <Refrigerator size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                My Digital Fridge <Sparkles size={18} className="text-orange-400" />
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                AI-Powered Home Pantry & Expiry Countdown Tracker
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => setAddModalOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all shadow-lg shadow-orange-500/20"
            >
              <Plus size={16} /> Add Item
            </button>
            <button
              onClick={handleGenerateRecipe}
              disabled={cooking}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-bold transition-all"
            >
              <ChefHat size={16} /> {cooking ? "Cooking..." : "AI Fridge Recipe"}
            </button>
          </div>
        </div>

        {/* Smart Alert Banner */}
        {alerts.length > 0 && (
          <div className="bg-red-950/40 border border-red-800/60 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="text-sm font-bold text-red-200">
                  {alerts.length} Item(s) Expiring within 24–48 Hours!
                </h4>
                <p className="text-xs text-red-300/80 mt-1">
                  {alerts[0].alert_message}
                </p>
              </div>
            </div>
            <button
              onClick={handleGenerateRecipe}
              className="shrink-0 flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md"
            >
              <ChefHat size={14} /> Cook Zero-Waste Meal <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Inventory List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-200">Fridge & Pantry Inventory</h3>
            <span className="text-xs font-semibold text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
              {items.length} items
            </span>
          </div>

          {loading ? (
            <div className="text-center py-16 text-slate-500 text-sm">Loading your digital fridge...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/30 rounded-2xl border border-slate-800/80 p-8 space-y-3">
              <div className="text-4xl">🧊</div>
              <h4 className="text-base font-bold text-slate-200">Your Digital Fridge is Empty</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Items you reserve on ExpiryGo or add manually will automatically track their expiration countdowns here.
              </p>
              <button
                onClick={() => setAddModalOpen(true)}
                className="mt-2 inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
              >
                <Plus size={16} /> Add First Item
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map((item) => {
                const isCritical = item.urgency_status === "CRITICAL";
                const isExpSoon = item.urgency_status === "EXPIRING_SOON";
                const colorClass = isCritical
                  ? "border-red-500/40 bg-red-950/20 text-red-400"
                  : isExpSoon
                  ? "border-amber-500/40 bg-amber-950/20 text-amber-400"
                  : "border-emerald-500/40 bg-emerald-950/20 text-emerald-400";

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border bg-slate-900/70 backdrop-blur-md flex flex-col justify-between gap-3 transition-all hover:border-slate-700 ${
                      isCritical ? "border-red-600/50 bg-red-950/10" : "border-slate-800"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              isCritical ? "bg-red-500 animate-pulse" : isExpSoon ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                          />
                          <h4 className="text-sm font-bold text-white tracking-wide">{item.name}</h4>
                        </div>
                        <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {item.category}
                        </span>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${colorClass}`}>
                        {item.hours_left <= 0
                          ? "Expired"
                          : item.hours_left <= 24
                          ? `⏱️ ${Math.round(item.hours_left)}h Left`
                          : `📅 ${item.days_left}d Left`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                      <span>Qty: <strong className="text-slate-200">{item.quantity}</strong></span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleMarkConsumed(item)}
                          className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                        >
                          <CheckCircle2 size={14} /> Eaten
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Item Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Add to Digital Fridge</h3>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold uppercase text-slate-400">Item Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Organic Milk, Fresh Bread, Paneer"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-400">Quantity</label>
                  <input
                    type="text"
                    placeholder="1 Litre, 500g"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-400">Days to Expiry</label>
                  <input
                    type="number"
                    min="1"
                    value={daysLeft}
                    onChange={(e) => setDaysLeft(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-slate-400">Category</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        category === cat
                          ? "bg-orange-500 text-white"
                          : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-orange-500/20"
              >
                {saving ? "Saving..." : "Save to Fridge"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* AI Recipe Modal */}
      {recipeModalOpen && recipe && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-orange-400">
                <Sparkles size={20} />
                <h3 className="text-lg font-black text-white">AI Fridge Recipe</h3>
              </div>
              <button onClick={() => setRecipeModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div>
              <h2 className="text-xl font-black text-white">{recipe.recipe_name}</h2>
              <p className="text-xs text-slate-400 mt-1">{recipe.description}</p>
            </div>

            <div className="flex gap-2 text-xs font-semibold text-orange-300">
              <span className="bg-orange-950/60 border border-orange-500/30 px-2.5 py-1 rounded-md">
                ⏱️ Prep: {recipe.prep_time}
              </span>
              <span className="bg-orange-950/60 border border-orange-500/30 px-2.5 py-1 rounded-md">
                🍳 Cook: {recipe.cook_time}
              </span>
              <span className="bg-orange-950/60 border border-orange-500/30 px-2.5 py-1 rounded-md">
                ⭐ {recipe.difficulty}
              </span>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Ingredients Used</h4>
              <div className="space-y-1 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                {recipe.ingredients.map((ing: RecipeIngredientItem, i: number) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-slate-200">• {ing.name}</span>
                    <span className="text-slate-400">{ing.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Step-by-Step Instructions</h4>
              <div className="space-y-2.5">
                {recipe.instructions.map((step: RecipeStep) => (
                  <div key={step.step_number} className="flex gap-3 text-xs leading-relaxed">
                    <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center shrink-0">
                      {step.step_number}
                    </span>
                    <span className="text-slate-300">{step.instruction}</span>
                  </div>
                ))}
              </div>
            </div>


            <div className="bg-emerald-950/30 border border-emerald-800/50 p-3.5 rounded-xl text-xs text-emerald-300 font-medium">
              🌱 {recipe.waste_saved_summary}
            </div>
          </div>
        </div>
      )}
      </div>
    </ShopperLayout>
  );
}
