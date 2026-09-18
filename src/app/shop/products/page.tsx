"use client";

import { useState, useEffect } from "react";
import { Search, Filter, CheckCircle2, XCircle, Loader2, Clock, Trash2, Package, Plus, Edit, ToggleLeft, ToggleRight, Sparkles, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useProducts } from "@/hooks/useProducts";
import { formatExpiryDisplay } from "@/lib/products/formatters";
import { deleteProduct, updateProduct, getProductAiInsight } from "@/services/products";
import { getMyShop, type ShopWithDescription } from "@/services/shops";
import { AlertTriangle } from "lucide-react";
import { useToast, ConfirmModal } from "@/components/ui/Toast";
import type { ProductCategory } from "@/types/product";

const CATEGORIES: ProductCategory[] = ["BAKERY", "DAIRY", "PRODUCE", "MEAT", "PANTRY", "PREPARED_FOOD", "OTHER"];

export default function ProductList() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"active" | "expired">("active");
  const [shop, setShop] = useState<ShopWithDescription | null>(null);
  const [shopId, setShopId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  // Confirm Modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmOpts, setConfirmOpts] = useState({ title: "", message: "", danger: false });
  const [confirmAction, setConfirmAction] = useState<() => Promise<void>>(() => async () => {});

  const [selectedProductForForecast, setSelectedProductForForecast] = useState<any | null>(null);
  const [forecastData, setForecastData] = useState<any | null>(null);
  const [loadingForecast, setLoadingForecast] = useState(false);

  const showConfirm = (title: string, message: string, action: () => Promise<void>, danger = false) => {
    setConfirmOpts({ title, message, danger });
    setConfirmAction(() => action);
    setConfirmOpen(true);
  };

  const handleOpenForecast = async (product: any) => {
    setSelectedProductForForecast(product);
    setLoadingForecast(true);
    setForecastData(null);
    try {
      const data = await getProductAiInsight(product.id);
      setForecastData(data);
    } catch {
      toast.error("Failed to load forecasting metrics.");
      setSelectedProductForForecast(null);
    } finally {
      setLoadingForecast(false);
    }
  };

  useEffect(() => {
    getMyShop()
      .then((s) => {
        setShop(s);
        setShopId(s.id);
      })
      .catch(() => {
        setShop(null);
        setShopId(undefined);
      });
  }, []);

  const { products, status, refetch } = useProducts({
    shopId: shopId || "pending_shop_load",
    hideExpired: activeTab === "active",
  });

  const filteredProducts = products.filter((product) => {
    if (!product.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (activeTab === "expired") return formatExpiryDisplay(product.expiry_date).isExpired;
    if (selectedCategory !== "ALL" && product.category !== selectedCategory) return false;
    return true;
  });

  const handleDelete = async (id: string) => {
    showConfirm(
      "Delete Deal",
      "Are you sure you want to permanently delete this product deal? This cannot be undone.",
      async () => {
        try {
          await deleteProduct(id);
          await refetch();
          toast.success("Product deal deleted successfully!");
          setSelectedProducts((prev) => { const s = new Set(prev); s.delete(id); return s; });
        } catch {
          toast.error("Failed to delete product.");
        }
      },
      true
    );
  };

  const handleToggleActive = async (product: any) => {
    try {
      const updatedData = {
        name: product.name,
        original_price: product.original_price,
        quantity: product.quantity,
        manufacturing_date: product.manufacturing_date,
        expiry_date: product.expiry_date,
        category: product.category,
        front_image_url: product.front_image_url,
        expiry_image_url: product.expiry_image_url,
        voice_note_url: product.voice_note_url,
        description: product.description,
        is_surprise_bag: product.is_surprise_bag,
        auto_discount_enabled: product.auto_discount_enabled,
        auto_discount_min_price: product.auto_discount_min_price,
        is_active: !product.is_active,
      };
      await updateProduct(product.id, updatedData);
      await refetch();
      toast.success(`Deal ${!product.is_active ? "activated" : "deactivated"} successfully!`);
    } catch {
      toast.error("Failed to update deal status.");
    }
  };

  // Bulk actions
  const toggleSelectProduct = (id: string) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map((p) => p.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedProducts.size === 0) return;
    showConfirm(
      `Delete ${selectedProducts.size} Products`,
      `Are you sure you want to delete ${selectedProducts.size} selected product(s)? This cannot be undone.`,
      async () => {
        const ids = Array.from(selectedProducts);
        for (const id of ids) {
          try { await deleteProduct(id); } catch { /* ignore individual */ }
        }
        setSelectedProducts(new Set());
        await refetch();
        toast.success(`${ids.length} product(s) deleted.`);
      },
      true
    );
  };

  const handleBulkToggle = async (activate: boolean) => {
    if (selectedProducts.size === 0) return;
    const ids = Array.from(selectedProducts);
    for (const id of ids) {
      const product = products.find((p) => p.id === id);
      if (!product) continue;
      try {
        await updateProduct(id, {
          name: product.name, original_price: product.original_price,
          quantity: product.quantity, manufacturing_date: product.manufacturing_date,
          expiry_date: product.expiry_date, category: product.category,
          front_image_url: product.front_image_url, expiry_image_url: product.expiry_image_url,
          voice_note_url: product.voice_note_url, description: product.description,
          is_surprise_bag: product.is_surprise_bag, auto_discount_enabled: product.auto_discount_enabled,
          auto_discount_min_price: product.auto_discount_min_price, is_active: activate,
        });
      } catch { /* continue */ }
    }
    setSelectedProducts(new Set());
    await refetch();
    toast.success(`${ids.length} product(s) ${activate ? "activated" : "deactivated"}.`);
  };

  return (
    <>
      <ConfirmModal
        open={confirmOpen}
        options={confirmOpts}
        onConfirm={async () => { setConfirmOpen(false); await confirmAction(); }}
        onCancel={() => setConfirmOpen(false)}
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Pending Approval Banner */}
        {shop && shop.approval_status !== "APPROVED" && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start gap-3">
            <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="text-sm font-bold">Store Under Review ({shop.approval_status})</h4>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                An administrator must approve <strong>{shop.name}</strong> before live deals can be added or published.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage your deals, update inventory, and view expired items.
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </div>
            {/* Filter button — now functional (gap #3) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowFilter(!showFilter)}
                className={`p-2 border rounded-xl text-sm font-bold flex items-center gap-1.5 transition ${showFilter ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
              >
                <Filter size={18} />
                <span className="hidden sm:inline">Filter</span>
                {selectedCategory !== "ALL" && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
              </button>
              {showFilter && (
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl z-30 p-2 space-y-0.5">
                  {["ALL", ...CATEGORIES].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => { setSelectedCategory(cat); setShowFilter(false); }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition ${selectedCategory === cat ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"}`}
                    >
                      {cat === "ALL" ? "All Categories" : cat.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Link
              href="/shop/products/add"
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition whitespace-nowrap"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Add Product</span>
            </Link>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-max">
            <button
              type="button"
              onClick={() => setActiveTab("active")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "active" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 hover:text-gray-700 dark:text-gray-400"}`}
            >
              <CheckCircle2 size={16} className={activeTab === "active" ? "text-emerald-500" : ""} />
              Active Deals
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("expired")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "expired" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 hover:text-gray-700 dark:text-gray-400"}`}
            >
              <XCircle size={16} className={activeTab === "expired" ? "text-red-500" : ""} />
              Expired Deals
            </button>
          </div>

          {/* Bulk Actions Bar — Gap #24 */}
          {selectedProducts.size > 0 && (
            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl px-3 py-1.5 text-sm">
              <span className="font-bold text-emerald-700 dark:text-emerald-400">{selectedProducts.size} selected</span>
              <button onClick={() => handleBulkToggle(true)} className="px-2 py-1 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition">Activate All</button>
              <button onClick={() => handleBulkToggle(false)} className="px-2 py-1 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-300 transition">Deactivate All</button>
              <button onClick={handleBulkDelete} className="px-2 py-1 rounded-lg bg-red-100 text-red-600 text-xs font-bold hover:bg-red-200 transition">Delete All</button>
              <button onClick={() => setSelectedProducts(new Set())} className="px-2 py-1 rounded-lg text-gray-500 text-xs hover:text-gray-700">Clear</button>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {status === "loading" ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="animate-spin text-emerald-500" size={32} />
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <th className="px-6 py-4 font-semibold w-8">
                      <input
                        type="checkbox"
                        checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                        onChange={selectAll}
                        className="rounded accent-emerald-500 cursor-pointer"
                      />
                    </th>
                    <th className="px-6 py-4 font-semibold">Product</th>
                    <th className="px-6 py-4 font-semibold">Price</th>
                    <th className="px-6 py-4 font-semibold">Stock</th>
                    <th className="px-6 py-4 font-semibold">Expiry Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredProducts.map((product) => {
                    const expiry = formatExpiryDisplay(product.expiry_date);
                    const isSelected = selectedProducts.has(product.id);
                    return (
                      <tr key={product.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition group ${isSelected ? "bg-emerald-50/50 dark:bg-emerald-500/5" : ""}`}>
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectProduct(product.id)}
                            className="rounded accent-emerald-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={product.front_image_url}
                              alt={product.name}
                              className="w-12 h-12 rounded-lg object-cover border border-gray-100 dark:border-gray-700"
                            />
                            <span className="font-medium text-gray-900 dark:text-white">{product.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900 dark:text-white">₹{product.discount_price.toFixed(2)}</span>
                            <span className="text-xs text-gray-400 line-through">₹{product.original_price.toFixed(2)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{product.quantity} units</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${expiry.isExpired ? "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400" : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"}`}>
                            <Clock size={14} />
                            {expiry.isExpired ? "Expired" : expiry.compact}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleActive(product)}
                              className={`p-2 rounded-lg transition flex items-center gap-1.5 text-xs font-semibold ${product.is_active ? "text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100" : "text-gray-400 hover:text-gray-500 bg-gray-100 hover:bg-gray-200"}`}
                              title={product.is_active ? "Click to Deactivate" : "Click to Activate"}
                            >
                              {product.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                              <span className="hidden md:inline">{product.is_active ? "Active" : "Inactive"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenForecast(product)}
                              className="p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition"
                              title="View AI Sales Forecast & Pricing Optimizer"
                            >
                              <Sparkles size={18} />
                            </button>
                            <Link
                              href={`/shop/products/edit?id=${product.id}`}
                              className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                              title="Edit Deal"
                            >
                              <Edit size={18} />
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDelete(product.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete Deal"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {status !== "loading" && filteredProducts.length === 0 && (
              <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                <Package size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p>No products found in this section.</p>
              </div>
            )}
          </div>
        </div>

        {/* AI Sales Forecast Modal */}
        {selectedProductForForecast && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden p-6 relative">
              <button
                onClick={() => { setSelectedProductForForecast(null); setForecastData(null); }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
              >
                <XCircle size={20} />
              </button>
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-sm mb-4">
                <Sparkles size={18} />AI Demand Forecasting & Optimizer
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{selectedProductForForecast.name}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Predicting rescue probability based on price, remaining shelf-life, and historic store demand.</p>
              {loadingForecast ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="animate-spin text-purple-500" size={36} />
                  <p className="text-sm font-semibold text-gray-500">Running Gradient Descent Forecaster...</p>
                </div>
              ) : forecastData ? (
                <div className="space-y-6">
                  <div className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-gray-100 dark:border-gray-850">
                    <div className="relative flex items-center justify-center w-32 h-32">
                      <div className="absolute w-20 h-20 bg-emerald-500/5 rounded-full filter blur-xl animate-pulse" />
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <defs>
                          <linearGradient id="modal-prob-grad-green" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#059669" />
                          </linearGradient>
                          <linearGradient id="modal-prob-grad-amber" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#d97706" />
                          </linearGradient>
                          <linearGradient id="modal-prob-grad-red" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#ef4444" /><stop offset="100%" stopColor="#dc2626" />
                          </linearGradient>
                        </defs>
                        <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="5" fill="transparent" className="text-gray-100 dark:text-gray-800" />
                        <circle cx="50" cy="50" r="40" stroke={`url(#${forecastData.rescue_probability >= 75 ? "modal-prob-grad-green" : forecastData.rescue_probability >= 40 ? "modal-prob-grad-amber" : "modal-prob-grad-red"})`} strokeWidth="6" fill="transparent" strokeDasharray={251.2} strokeDashoffset={251.2 - (251.2 * forecastData.rescue_probability) / 100} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{forecastData.rescue_probability}%</span>
                        <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Rescue Prob.</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800/50 rounded-xl">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Est. Sellout Time</p>
                      <p className="text-lg font-extrabold text-gray-800 dark:text-gray-200 mt-1">{forecastData.sellout_hours} hrs</p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800/50 rounded-xl">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Model Confidence</p>
                      <p className="text-lg font-extrabold text-gray-800 dark:text-gray-200 mt-1">{(forecastData.model_confidence * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                  <div className="p-4 bg-purple-50/50 dark:bg-purple-950/10 border border-purple-100 dark:border-purple-900/30 rounded-2xl space-y-3">
                    <div className="text-xs font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1.5"><Sparkles size={14} />AI Price Optimization Recommendation</div>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Suggested Markdown</p>
                        <p className="text-xl font-black text-purple-700 dark:text-purple-400">{forecastData.optimal_discount_percent}% Off</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Target AI Price</p>
                        <p className="text-xl font-black text-purple-700 dark:text-purple-400">₹{forecastData.optimal_price.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="pt-2 flex gap-3">
                    <button onClick={() => { setSelectedProductForForecast(null); setForecastData(null); }} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition">Close</button>
                    <button
                      onClick={async () => {
                        try {
                          const discountFraction = (100 - forecastData.optimal_discount_percent) / 100;
                          const newOriginalPrice = forecastData.optimal_price / discountFraction;
                          await updateProduct(selectedProductForForecast.id, {
                            name: selectedProductForForecast.name, original_price: parseFloat(newOriginalPrice.toFixed(2)),
                            quantity: selectedProductForForecast.quantity, manufacturing_date: selectedProductForForecast.manufacturing_date,
                            expiry_date: selectedProductForForecast.expiry_date, category: selectedProductForForecast.category,
                            front_image_url: selectedProductForForecast.front_image_url, expiry_image_url: selectedProductForForecast.expiry_image_url,
                            voice_note_url: selectedProductForForecast.voice_note_url, description: selectedProductForForecast.description,
                            is_surprise_bag: selectedProductForForecast.is_surprise_bag, auto_discount_enabled: selectedProductForForecast.auto_discount_enabled,
                            auto_discount_min_price: selectedProductForForecast.auto_discount_min_price, is_active: selectedProductForForecast.is_active,
                          });
                          await refetch();
                          toast.success("AI optimized discount price applied!", "Product price updated successfully.");
                          setSelectedProductForForecast(null); setForecastData(null);
                        } catch {
                          toast.error("Failed to apply AI optimized price.");
                        }
                      }}
                      className="flex-1 px-4 py-3 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 shadow-lg shadow-purple-500/25 transition"
                    >
                      Apply AI Price
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-red-500 font-semibold py-4 text-center">Failed to load forecast data.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
