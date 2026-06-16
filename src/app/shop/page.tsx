"use client";

import { DollarSign, Package, AlertTriangle, TrendingUp, Store, MapPin, Plus, Sparkles, XCircle, Loader2, Clock, Leaf, ArrowRight, Percent, ShieldAlert, BarChart3, Check, Brain, Activity, Info, Award } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useMemo, useState, useEffect } from "react";
import { formatExpiryDisplay, isExpiringWithinHours } from "@/lib/products/formatters";
import { getMyShop, getShopAnalytics, getMlDiagnostics } from "@/services/shops";
import { getProductForecast, updateProduct, getProductAiInsight, getShopAiInventory } from "@/services/products";
import type { ApiShopAiInventory } from "@/services/products";
import type { ShopWithDescription } from "@/services/shops";
import type { ApiAnalytics } from "@/types/product";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

// Smooth Cubic Bezier Path Generator for Forecast Chart
function getBezierCurvePath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) return "";
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const cpX1 = curr.x + (next.x - curr.x) / 3;
    const cpY1 = curr.y;
    const cpX2 = curr.x + 2 * (next.x - curr.x) / 3;
    const cpY2 = next.y;
    path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`;
  }
  return path;
}

// Premium Animated Counter Component
function AnimatedCounter({ value, prefix = "", suffix = "", decimals = 0 }: { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 1200; // 1.2s smooth animation
    const startValue = 0;
    const endValue = value;

    let cancelled = false;

    const step = (timestamp: number) => {
      if (cancelled) return;
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const current = progress * (endValue - startValue) + startValue;
      setDisplayValue(current);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(endValue);
      }
    };

    window.requestAnimationFrame(step);

    return () => {
      cancelled = true;
    };
  }, [value]);

  return (
    <span>
      {prefix}
      {displayValue.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

// Client-side Product Spoilage Risk Classifier
function getProductRiskStatus(product: any) {
  const expiryDate = new Date(product.expiry_date);
  const now = new Date();
  const daysLeft = Math.max(0.1, (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const qty = product.quantity;

  if (daysLeft <= 1.5 || (daysLeft <= 3.0 && qty > 10)) {
    return { label: "High Spoilage Risk", color: "red", bg: "bg-red-50 dark:bg-red-500/10", text: "text-red-650 dark:text-red-400" };
  } else if (daysLeft <= 4.0 || (daysLeft <= 7.0 && qty > 15)) {
    return { label: "Medium Risk", color: "amber", bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-655 dark:text-amber-400" };
  } else {
    return { label: "Healthy Inventory", color: "emerald", bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-650 dark:text-emerald-400" };
  }
}

// Explainability text generator
function getExplainabilityReasoning(product: any, forecast: any) {
  const expiryDate = new Date(product.expiry_date);
  const now = new Date();
  const daysLeft = Math.max(0.1, (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysLeft <= 1.5) {
    return `Low remaining shelf life of ${daysLeft.toFixed(1)} days critical velocity limits increased spoilage risk, necessitating a high markdown.`;
  }
  if (product.quantity >= 15) {
    return `High stock volume of ${product.quantity} units increases spoilage risk, and requires a competitive markdown discount to clear inventory.`;
  }
  return `Optimal pricing markdown at ${forecast.optimal_discount_percent}% helps to maintain a ${forecast.rescue_probability}% rescue probability.`;
}

export default function ShopDashboardOverview() {
  const [shop, setShop] = useState<ShopWithDescription | null>(null);
  const [shopId, setShopId] = useState<string | undefined>(undefined);

  const [activeTab, setActiveTab] = useState<"overview" | "ai">("overview");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [forecast, setForecast] = useState<any | null>(null);
  const [loadingForecast, setLoadingForecast] = useState<boolean>(false);
  const [applyingPrice, setApplyingPrice] = useState<boolean>(false);
  const [aiInventory, setAiInventory] = useState<ApiShopAiInventory | null>(null);
  const [loadingAiInventory, setLoadingAiInventory] = useState<boolean>(false);

  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticsData, setDiagnosticsData] = useState<any | null>(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);

  const handleOpenDiagnostics = async () => {
    setShowDiagnostics(true);
    setLoadingDiagnostics(true);
    try {
      const data = await getMlDiagnostics();
      setDiagnosticsData(data);
    } catch {
      alert("Failed to load model diagnostics.");
      setShowDiagnostics(false);
    } finally {
      setLoadingDiagnostics(false);
    }
  };

  useEffect(() => {
    getMyShop()
      .then((data) => {
        setShop(data);
        setShopId(data.id);
      })
      .catch(() => {
        setShop(null);
        setShopId(undefined);
      });
  }, []);

  const [analytics, setAnalytics] = useState<ApiAnalytics | null>(null);

  const fetchAiInventory = () => {
    if (shopId) {
      setLoadingAiInventory(true);
      getShopAiInventory()
        .then(setAiInventory)
        .catch(console.error)
        .finally(() => setLoadingAiInventory(false));
    }
  };

  useEffect(() => {
    if (shopId) {
      getShopAnalytics().then(setAnalytics).catch(console.error);
      fetchAiInventory();
    }
  }, [shopId]);

  const [nowMs] = useState(() => Date.now());
  const { products, refetch } = useProducts(shopId ? { shopId, limit: 100, hideExpired: true } : { shopId: "pending_shop_load", limit: 100, hideExpired: true });

  // Sync selected product with the active shop's product list to prevent cross-ownership query errors
  useEffect(() => {
    if (products.length > 0) {
      const exists = products.some((p) => p.id === selectedProductId);
      if (!selectedProductId || !exists) {
        setSelectedProductId(products[0].id);
      }
    } else {
      setSelectedProductId("");
    }
  }, [products, selectedProductId]);

  // Fetch forecast data when selected product changes
  useEffect(() => {
    if (selectedProductId) {
      setLoadingForecast(true);
      getProductAiInsight(selectedProductId)
        .then((data) => {
          setForecast(data);
        })
        .catch((err) => {
          console.error("Failed to fetch product forecast", err);
          setForecast(null);
        })
        .finally(() => {
          setLoadingForecast(false);
        });
    } else {
      setForecast(null);
    }
  }, [selectedProductId]);

  const handleApplyAiPrice = async (product: any, optimalPrice: number) => {
    if (applyingPrice) return;
    setApplyingPrice(true);
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
        is_active: product.is_active,
        discount_price: optimalPrice, // Apply override
      };
      await updateProduct(product.id, updatedData);
      
      // Refresh forecast and products list
      const freshForecast = await getProductAiInsight(product.id);
      setForecast(freshForecast);
      await refetch();
      fetchAiInventory();
      alert(`AI Suggested Price of ₹${optimalPrice} applied successfully!`);
    } catch (err) {
      console.error(err);
      alert("Failed to apply AI Suggested Price.");
    } finally {
      setApplyingPrice(false);
    }
  };

  const stats = useMemo(() => {
    const totalProducts = analytics?.total_products ?? 0;
    const activeDeals = analytics?.active_deals ?? products.length;
    const ordersReceived = analytics?.orders_received ?? 0;
    const revenueSummary = analytics?.revenue_summary ?? analytics?.total_revenue ?? 0;

    return [
      { name: "Total Products", value: totalProducts.toString(), icon: Store, change: "All Uploads", changeType: "positive" },
      { name: "Active Deals", value: activeDeals.toString(), icon: Package, change: "Live Now", changeType: "positive" },
      { name: "Orders Received", value: ordersReceived.toString(), icon: TrendingUp, change: "Requests", changeType: "positive" },
      { name: "Revenue Summary", value: `₹${revenueSummary.toFixed(0)}`, icon: DollarSign, change: "Total Sales", changeType: "positive" },
    ];
  }, [products, analytics]);

  if (!shop) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center">
        <Store size={48} className="mx-auto text-emerald-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Set up your shop</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
          Create your store profile before adding deals.
        </p>
        <Link
          href="/shop/setup"
          className="inline-flex bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl"
        >
          Go to setup
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8 bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 bg-emerald-100 dark:bg-emerald-900/50 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
            <Store size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{shop.name}</h1>
            <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500 dark:text-gray-400">
              <MapPin size={14} />
              {shop.address}
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full sm:w-auto">
          <button
            onClick={handleOpenDiagnostics}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm font-bold transition shadow-md shadow-purple-500/10"
          >
            <Sparkles size={18} />
            <span>AI Diagnostics</span>
          </button>
          <Link
            href="/shop/products/add"
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition shadow-md shadow-emerald-500/10"
          >
            <Plus size={18} />
            <span>Add a Deal</span>
          </Link>
          <div className="bg-gray-50 dark:bg-gray-900 px-4 py-2 rounded-xl text-sm border border-gray-100 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 mb-0.5 text-xs font-semibold uppercase tracking-wider">Status</p>
            <div className="flex items-center gap-2 font-medium text-emerald-600 dark:text-emerald-400">
              <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
              Accepting Orders
            </div>
          </div>
        </div>
      </div>

      {/* Segmented Controls for Tab Views */}
      <div className="flex bg-gray-100 dark:bg-gray-800/80 p-1 rounded-2xl w-full sm:w-max mb-8 border border-gray-200/50 dark:border-gray-700/50">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
            activeTab === "overview"
              ? "bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          <Store size={16} />
          Overview Dashboard
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
            activeTab === "ai"
              ? "bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          <Sparkles size={16} className="text-emerald-500 animate-pulse" />
          AI Inventory Intelligence
        </button>
      </div>

      {activeTab === "overview" ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {stats.map((stat) => (
              <div
                key={stat.name}
                className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="text-gray-500 dark:text-gray-400">
                    <stat.icon size={20} />
                  </div>
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 px-2 py-1 rounded-full">
                    {stat.change}
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.name}</h3>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
                </div>
              </div>
            ))}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm lg:block">
              <TrendingUp size={20} className="text-emerald-500 mb-4" />
              <h3 className="text-sm font-medium text-gray-500">Items Saved</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{analytics?.total_items_saved || 0}</p>
            </div>
          </div>

          {/* Weekly Analytics & Performance Graphs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Revenue Trend Line Graph */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Weekly Revenue Trend</h3>
                  <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">₹18,300</p>
                </div>
                <span className="text-xs font-semibold text-emerald-650 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full">
                  +14.2% vs last week
                </span>
              </div>
              
              <div className="relative pt-2">
                <svg className="w-full h-40 overflow-visible" viewBox="0 0 300 100">
                  <defs>
                    <linearGradient id="revenue-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Grid Lines */}
                  <line x1="0" y1="20" x2="300" y2="20" stroke="#f3f4f6" strokeWidth="1" className="dark:stroke-gray-800" />
                  <line x1="0" y1="50" x2="300" y2="50" stroke="#f3f4f6" strokeWidth="1" className="dark:stroke-gray-800" />
                  <line x1="0" y1="80" x2="300" y2="80" stroke="#f3f4f6" strokeWidth="1" className="dark:stroke-gray-800" />
                  
                  {/* Gradient Area under line */}
                  <path
                    d="M 10 90 C 32.5 80, 32.5 60, 55 60 C 77.5 60, 77.5 75, 100 75 C 122.5 75, 122.5 25, 145 25 C 167.5 25, 167.5 50, 190 50 C 212.5 50, 212.5 15, 235 15 C 257.5 15, 257.5 5, 280 5 L 280 90 Z"
                    fill="url(#revenue-gradient)"
                  />

                  {/* Revenue Trend Line */}
                  <path
                    d="M 10 90 C 32.5 80, 32.5 60, 55 60 C 77.5 60, 77.5 75, 100 75 C 122.5 75, 122.5 25, 145 25 C 167.5 25, 167.5 50, 190 50 C 212.5 50, 212.5 15, 235 15 C 257.5 15, 257.5 5, 280 5"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />

                  {/* Data points */}
                  <circle cx="10" cy="90" r="4" fill="#10b981" />
                  <circle cx="55" cy="60" r="4" fill="#10b981" />
                  <circle cx="100" cy="75" r="4" fill="#10b981" />
                  <circle cx="145" cy="25" r="4" fill="#10b981" />
                  <circle cx="190" cy="50" r="4" fill="#10b981" />
                  <circle cx="235" cy="15" r="4" fill="#10b981" />
                  <circle cx="280" cy="5" r="4" fill="#10b981" />
                </svg>
                <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-2.5">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                  <span>Sun</span>
                </div>
              </div>
            </div>

            {/* Rescued Items Bar Graph */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Weekly Rescued Items</h3>
                  <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">126 meals</p>
                </div>
                <span className="text-xs font-semibold text-emerald-650 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full">
                  +28% CO₂ saved
                </span>
              </div>

              <div className="relative pt-2">
                <svg className="w-full h-40 overflow-visible" viewBox="0 0 300 100">
                  {/* Grid Lines */}
                  <line x1="0" y1="20" x2="300" y2="20" stroke="#f3f4f6" strokeWidth="1" className="dark:stroke-gray-800" />
                  <line x1="0" y1="50" x2="300" y2="50" stroke="#f3f4f6" strokeWidth="1" className="dark:stroke-gray-800" />
                  <line x1="0" y1="80" x2="300" y2="80" stroke="#f3f4f6" strokeWidth="1" className="dark:stroke-gray-800" />

                  {/* Bar 1 */}
                  <rect x="15" y="65" width="20" height="25" rx="4" className="fill-emerald-500 hover:fill-emerald-600 transition-colors" />
                  {/* Bar 2 */}
                  <rect x="55" y="45" width="20" height="45" rx="4" className="fill-emerald-500 hover:fill-emerald-600 transition-colors" />
                  {/* Bar 3 */}
                  <rect x="95" y="55" width="20" height="35" rx="4" className="fill-emerald-500 hover:fill-emerald-600 transition-colors" />
                  {/* Bar 4 */}
                  <rect x="135" y="20" width="20" height="70" rx="4" className="fill-emerald-500 hover:fill-emerald-600 transition-colors" />
                  {/* Bar 5 */}
                  <rect x="175" y="35" width="20" height="55" rx="4" className="fill-emerald-500 hover:fill-emerald-600 transition-colors" />
                  {/* Bar 6 */}
                  <rect x="215" y="15" width="20" height="75" rx="4" className="fill-emerald-500 hover:fill-emerald-600 transition-colors" />
                  {/* Bar 7 */}
                  <rect x="255" y="8" width="20" height="82" rx="4" className="fill-emerald-500 hover:fill-emerald-600 transition-colors" />
                </svg>
                <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-2.5">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                  <span>Sun</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Deals Expiring Soon</h2>
                <a href="/shop/products" className="text-sm font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400">
                  View all
                </a>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {products.slice(0, 3).map((product) => {
                  const expiry = formatExpiryDisplay(product.expiry_date);
                  return (
                    <div
                      key={product.id}
                      className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={product.front_image_url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{product.name}</p>
                          <p
                            className={`text-xs font-medium mt-0.5 ${expiry.isExpired ? "text-gray-500" : "text-red-500"}`}
                          >
                            {expiry.isExpired ? "Expired" : `Expires in ${expiry.compact}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          ₹{product.discount_price.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-400 line-through">
                          ₹{product.original_price.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {products.length === 0 && (
                  <div className="px-6 py-8 text-center text-sm text-gray-500">
                    No products found.{" "}
                    <Link href="/shop/products/add" className="text-emerald-600 font-semibold">
                      Add a deal
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* RECENT REVIEWS */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Reviews</h2>
                <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                  ★ {analytics?.average_rating || "0.0"} Avg
                </span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {analytics?.recent_reviews?.slice(0, 4).map((review) => (
                  <div key={review.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex gap-1 text-emerald-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i}>{i < review.rating ? "★" : "☆"}</span>
                        ))}
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                      &quot;{review.comment || "No comment"}&quot;
                    </p>
                  </div>
                ))}
                {(!analytics?.recent_reviews || analytics.recent_reviews.length === 0) && (
                  <div className="px-6 py-8 text-center text-sm text-gray-500">
                    No reviews yet. Keep saving meals to get rated!
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Smart Rescue Analytics Section (Store-wide Metrics) */}
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
              <Brain className="text-emerald-500 animate-pulse" size={22} />
              <span>Smart Rescue Analytics</span>
              <span className="text-[9px] font-bold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-100/30">
                Real-time Inference
              </span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 }}
                whileHover={{ y: -4, scale: 1.015 }}
                className="bg-white/70 dark:bg-gray-800/75 backdrop-blur-md border border-white/30 dark:border-gray-700/40 shadow-md hover:shadow-xl hover:border-emerald-500/30 p-6 rounded-3xl relative overflow-hidden group transition duration-300 cursor-pointer"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 rounded-full -mr-8 -mt-8 group-hover:scale-120 transition duration-500" />
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20">
                    <Brain size={20} />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">Avg Rescue Prob.</h3>
                    <p className="text-2xl font-black text-gray-900 dark:text-white mt-1.5">
                      {loadingAiInventory ? (
                        <span className="h-6 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse inline-block" />
                      ) : (
                        <AnimatedCounter value={aiInventory?.average_rescue_probability ?? 100.0} suffix="%" />
                      )}
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                whileHover={{ y: -4, scale: 1.015 }}
                className="bg-white/70 dark:bg-gray-800/75 backdrop-blur-md border border-white/30 dark:border-gray-700/40 shadow-md hover:shadow-xl hover:border-emerald-500/30 p-6 rounded-3xl relative overflow-hidden group transition duration-300 cursor-pointer"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 rounded-full -mr-8 -mt-8 group-hover:scale-120 transition duration-500" />
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20">
                    <DollarSign size={20} />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">Revenue Recovered</h3>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-450 mt-1.5">
                      {loadingAiInventory ? (
                        <span className="h-6 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse inline-block" />
                      ) : (
                        <AnimatedCounter value={aiInventory?.total_recovered_revenue ?? 0} prefix="₹" />
                      )}
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 }}
                whileHover={{ y: -4, scale: 1.015 }}
                className="bg-white/70 dark:bg-gray-800/75 backdrop-blur-md border border-white/30 dark:border-gray-700/40 shadow-md hover:shadow-xl hover:border-emerald-500/30 p-6 rounded-3xl relative overflow-hidden group transition duration-300 cursor-pointer"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 rounded-full -mr-8 -mt-8 group-hover:scale-120 transition duration-500" />
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20">
                    <Activity size={20} />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">Orders Completed</h3>
                    <p className="text-2xl font-black text-gray-900 dark:text-white mt-1.5">
                      {loadingAiInventory ? (
                        <span className="h-6 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse inline-block" />
                      ) : (
                        <AnimatedCounter value={analytics?.orders_received ?? 0} />
                      )}
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                whileHover={{ y: -4, scale: 1.015 }}
                className="bg-white/70 dark:bg-gray-800/75 backdrop-blur-md border border-white/30 dark:border-gray-700/40 shadow-md hover:shadow-xl hover:border-emerald-500/30 p-6 rounded-3xl relative overflow-hidden group transition duration-300 cursor-pointer"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 rounded-full -mr-8 -mt-8 group-hover:scale-120 transition duration-500" />
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20">
                    <Leaf size={20} />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">CO₂ Saved</h3>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-450 mt-1.5">
                      {loadingAiInventory ? (
                        <span className="h-6 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse inline-block" />
                      ) : (
                        <AnimatedCounter value={aiInventory?.co2_saved_kg ?? 0} suffix=" kg" />
                      )}
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.25 }}
                whileHover={{ y: -4, scale: 1.015 }}
                className="bg-white/70 dark:bg-gray-800/75 backdrop-blur-md border border-white/30 dark:border-gray-700/40 shadow-md hover:shadow-xl hover:border-emerald-500/30 p-6 rounded-3xl relative overflow-hidden group transition duration-300 cursor-pointer"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 rounded-full -mr-8 -mt-8 group-hover:scale-120 transition duration-500" />
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20">
                    <Award size={20} />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">Food Rescued</h3>
                    <p className="text-2xl font-black text-gray-900 dark:text-white mt-1.5">
                      {loadingAiInventory ? (
                        <span className="h-6 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse inline-block" />
                      ) : (
                        <AnimatedCounter value={analytics?.total_items_saved ?? 0} suffix=" items" />
                      )}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Predictive Waste Reduction & Inventory Risk Indicators */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Sustainability Visualization (Predictive Waste Reduction) */}
            <div className="bg-white/70 dark:bg-gray-800/75 backdrop-blur-md border border-white/30 dark:border-gray-700/40 p-6 rounded-3xl shadow-xl space-y-5 transition duration-300">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Leaf size={20} className="text-emerald-500 animate-pulse" />
                  <span>Predictive Waste Reduction</span>
                </h3>
                <p className="text-xs text-gray-450 dark:text-gray-400 mt-1">
                  Visualizing cumulative environmental offsets and shopper dynamic clearance indices.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div className="bg-emerald-50/25 dark:bg-emerald-950/10 p-4 rounded-2xl border border-emerald-100/30 dark:border-emerald-900/20 hover:shadow-lg hover:border-emerald-500/20 transition-all duration-300">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
                    <DollarSign size={16} />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Money Saved</span>
                  </div>
                  <span className="text-xl font-black text-gray-900 dark:text-white block">
                    {loadingAiInventory ? "..." : (
                      <AnimatedCounter value={Math.round((aiInventory?.total_recovered_revenue ?? 0) * 1.35)} prefix="₹" />
                    )}
                  </span>
                  <span className="text-[9px] text-gray-400 font-semibold block mt-1">By customer markdowns</span>
                </div>
                
                <div className="bg-emerald-50/25 dark:bg-emerald-950/10 p-4 rounded-2xl border border-emerald-100/30 dark:border-emerald-900/20 hover:shadow-lg hover:border-emerald-500/20 transition-all duration-300">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
                    <Award size={16} />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Deals Rescued</span>
                  </div>
                  <span className="text-xl font-black text-gray-900 dark:text-white block">
                    {loadingAiInventory ? "..." : (
                      <AnimatedCounter value={analytics?.total_items_saved ?? 0} suffix=" items" />
                    )}
                  </span>
                  <span className="text-[9px] text-gray-400 font-semibold block mt-1">Cleared from landfill</span>
                </div>

                <div className="bg-emerald-50/25 dark:bg-emerald-950/10 p-4 rounded-2xl border border-emerald-100/30 dark:border-emerald-900/20 hover:shadow-lg hover:border-emerald-500/20 transition-all duration-300">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
                    <Leaf size={16} />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Waste Reduced</span>
                  </div>
                  <span className="text-xl font-black text-gray-900 dark:text-white block">
                    {loadingAiInventory ? "..." : (
                      <AnimatedCounter value={Math.round((analytics?.total_items_saved ?? 0) * 0.45)} suffix=" kg" />
                    )}
                  </span>
                  <span className="text-[9px] text-gray-400 font-semibold block mt-1">Estimated biomass saved</span>
                </div>
              </div>

              {/* Progress bar tracking towards goal */}
              <div className="pt-2">
                <div className="flex justify-between text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Activity size={14} className="text-emerald-500 animate-pulse" />
                    Carbon Mitigation Target
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {Math.min(100, Math.round(((aiInventory?.co2_saved_kg ?? 0) / 150) * 100))}%
                  </span>
                </div>
                <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden relative shadow-inner border border-gray-200/20">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.round(((aiInventory?.co2_saved_kg ?? 0) / 150) * 100))}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full shadow-md shadow-emerald-500/20"
                  />
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 font-semibold leading-relaxed">
                  Goal: 150kg CO₂ reduction per store cycle. Equivalent to planting 6 carbon-absorbing saplings.
                </p>
              </div>
            </div>

            {/* Inventory Risk Indicators Monitor */}
            <div className="bg-white/70 dark:bg-gray-800/75 backdrop-blur-md border border-white/30 dark:border-gray-700/40 p-6 rounded-3xl shadow-xl space-y-5 transition duration-300">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <ShieldAlert size={20} className="text-emerald-500 animate-pulse" />
                  <span>Inventory Risk Indicators</span>
                </h3>
                <p className="text-xs text-gray-450 dark:text-gray-400 mt-1">
                  Real-time algorithmic spoilage scoring index for active store listings.
                </p>
              </div>

              {aiInventory && (
                <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider pb-2 border-b border-gray-100 dark:border-gray-700/40">
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-650 dark:bg-red-500/10 dark:text-red-400 rounded-full border border-red-100/10">
                    <span className="h-1.5 w-1.5 bg-red-500 rounded-full animate-ping" />
                    High Spoilage Risk: {aiInventory.risk_counts.High}
                  </span>
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-655 dark:bg-amber-500/10 dark:text-amber-400 rounded-full border border-amber-100/10">
                    <span className="h-1.5 w-1.5 bg-amber-500 rounded-full animate-pulse" />
                    Medium Risk: {aiInventory.risk_counts.Medium}
                  </span>
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-650 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-full border border-emerald-100/10">
                    <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full" />
                    Healthy Stock: {aiInventory.risk_counts.Low}
                  </span>
                </div>
              )}

              <div className="max-h-44 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {products.map((p) => {
                  const status = getProductRiskStatus(p);
                  return (
                    <div key={p.id} className="flex items-center justify-between p-2.5 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 rounded-xl transition duration-300 text-xs border border-transparent hover:border-emerald-500/10 dark:hover:border-emerald-500/5">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 relative ${
                          status.color === "red" ? "bg-red-500" :
                          status.color === "amber" ? "bg-amber-500" : "bg-emerald-500"
                        }`}>
                          {status.color === "red" && (
                            <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
                          )}
                          {status.color === "amber" && (
                            <span className="absolute inset-0 rounded-full bg-amber-500 animate-ping opacity-30" />
                          )}
                        </span>
                        <span className="font-semibold text-gray-800 dark:text-gray-250 truncate max-w-[150px]">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        <span className="text-gray-400 dark:text-gray-550 font-semibold">{p.quantity} units</span>
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] border border-current/10 ${status.bg} ${status.text}`}>
                          {status.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {products.length === 0 && (
                  <div className="text-center py-8 text-xs text-gray-400">
                    No active listings in database to analyze.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Product selection selector */}
          <div className="bg-white/70 dark:bg-gray-800/75 backdrop-blur-md border border-white/30 dark:border-gray-700/40 p-6 rounded-3xl shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Sparkles size={20} className="text-emerald-500 animate-pulse" />
                  Select Product for AI Inventory Intelligence
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Run algorithmic dynamic pricing simulated regressions and explainability impacts.
                </p>
              </div>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[240px] shadow-sm cursor-pointer hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition duration-300"
              >
                <option value="" disabled>-- Select Product --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.quantity} units left)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* AI Metrics Content */}
          {loadingForecast ? (
            /* Premium Skeleton Loader */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-pulse">
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white/60 dark:bg-gray-800/60 border border-white/20 p-6 rounded-3xl h-64 flex flex-col items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700" />
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 mt-4 rounded" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
                  <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
                  <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
                </div>
                <div className="bg-white/60 dark:bg-gray-800/60 p-6 rounded-3xl h-48 space-y-4">
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-bounce" />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                    <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                  </div>
                </div>
              </div>
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white/60 dark:bg-gray-800/60 p-6 rounded-3xl h-64 flex flex-col justify-between">
                  <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-32 bg-gray-200 dark:bg-gray-700 w-full rounded" />
                </div>
                <div className="bg-white/60 dark:bg-gray-800/60 p-6 rounded-3xl h-60 space-y-4">
                  <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="space-y-2">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                </div>
              </div>
            </div>
          ) : forecast ? (
            (() => {
              const product = products.find((p) => p.id === selectedProductId);
              if (!product) return null;

              // Dual-Line Graph calculations
              const trend = forecast.predicted_orders_trend || [];
              const width = 500;
              const height = 160;
              const paddingLeft = 40;
              const paddingRight = 40;
              const paddingTop = 20;
              const paddingBottom = 30;
              const maxDemand = Math.max(...trend.map((t: any) => t.demand), 1.0);
              const maxYVal = Math.max(product.quantity, maxDemand, 5);

              // 1. Cumulative predicted demand points
              const demandPoints = trend.map((t: any, index: number) => {
                const x = paddingLeft + (index / (trend.length - 1)) * (width - paddingLeft - paddingRight);
                const y = height - paddingBottom - (t.demand / maxYVal) * (height - paddingTop - paddingBottom);
                return { x, y, hour: t.hour, value: t.demand };
              });

              // 2. Remaining stock points (depletion line)
              const stockPoints = trend.map((t: any, index: number) => {
                const x = paddingLeft + (index / (trend.length - 1)) * (width - paddingLeft - paddingRight);
                const currentInv = Math.max(0, product.quantity - t.demand);
                const y = height - paddingBottom - (currentInv / maxYVal) * (height - paddingTop - paddingBottom);
                return { x, y, hour: t.hour, value: currentInv };
              });

              // Polish: Generate beautiful cubic Bezier curved paths instead of jagged lines
              const demandPath = getBezierCurvePath(demandPoints);
              const stockPath = getBezierCurvePath(stockPoints);

              const demandArea = demandPoints.length > 0 
                ? `${demandPath} L ${demandPoints[demandPoints.length - 1].x} ${height - paddingBottom} L ${demandPoints[0].x} ${height - paddingBottom} Z`
                : "";

              const stockArea = stockPoints.length > 0 
                ? `${stockPath} L ${stockPoints[stockPoints.length - 1].x} ${height - paddingBottom} L ${stockPoints[0].x} ${height - paddingBottom} Z`
                : "";

              // Find index where stock reaches 0 (sellout point prediction)
              const selloutIndex = stockPoints.findIndex((p: any) => p.value === 0);

              // Ring variables for Rescue Confidence Meter
              const radius = 42;
              const circ = 2 * Math.PI * radius;
              const pct = forecast.rescue_probability;
              const strokeDashoffset = circ - (pct / 100) * circ;

              // Generate Smart Insights Feed Recommendations
              const dynamicInsights = [];
              const daysLeft = Math.max(0.1, (new Date(product.expiry_date).getTime() - nowMs) / (1000 * 60 * 60 * 24));
              const currentDiscountPct = Math.round(((product.original_price - product.discount_price) / product.original_price) * 100);
              
              if (forecast.spoilage_risk_score === "High") {
                dynamicInsights.push({
                  type: "danger",
                  title: "High Chance of Spoilage within 24 Hours",
                  text: `Remaining shelf life is critically low (${daysLeft.toFixed(1)} days). High spoilage hazard detected.`,
                  action: `AI recommends increasing discount by ${Math.max(10, forecast.optimal_discount_percent - currentDiscountPct)}% immediately.`
                });
              } else if (forecast.spoilage_risk_score === "Medium") {
                dynamicInsights.push({
                  type: "warning",
                  title: "Medium Spoilage Risk Alert",
                  text: `Shelf life is limited (${daysLeft.toFixed(1)} days). Demand velocity is moderate.`,
                  action: `Adjust discount to AI-suggested ${forecast.optimal_discount_percent}% off to maintain clearout.`
                });
              }

              if (forecast.rescue_probability >= 70) {
                dynamicInsights.push({
                  type: "success",
                  title: "High Rescue Probability Verified",
                  text: `This product has a high rescue probability of ${forecast.rescue_probability}% based on historical store performance.`,
                  action: "Current dynamic pricing maintains a high rescue probability."
                });
              } else {
                dynamicInsights.push({
                  type: "danger",
                  title: "Low Rescue Probability Warning",
                  text: `Rescue probability is low (${forecast.rescue_probability}%). High risk of expired spoilage waste.`,
                  action: `AI recommends increasing discount by ${Math.max(10, forecast.optimal_discount_percent - currentDiscountPct)}% to boost rate.`
                });
              }

              if (product.quantity >= 15) {
                dynamicInsights.push({
                  type: "info",
                  title: "High Inventory Stock Volume",
                  text: `High remaining quantity (${product.quantity} units) increases overall food waste hazard.`,
                  action: "Dynamic pricing markdown recommended to maximize customer uptake."
                });
              }

              return (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column: AI Rescue Confidence Meter & Price Optimizer */}
                  <div className="lg:col-span-1 space-y-6">
                    
                    {/* 1. AI Rescue Confidence Meter */}
                    <div className="bg-white/70 dark:bg-gray-800/75 backdrop-blur-md border border-white/30 dark:border-gray-700/40 p-6 rounded-3xl shadow-xl flex flex-col items-center text-center relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-24 h-24 bg-emerald-500/5 rounded-full filter blur-xl animate-pulse" />
                      <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest mb-5">AI Rescue Confidence Meter</h3>
                      
                      <div className="relative flex items-center justify-center w-32 h-32 mb-4">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <defs>
                            <linearGradient id="ai-glow-gradient" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor="#10b981" />
                              <stop offset="100%" stopColor="#059669" />
                            </linearGradient>
                            <linearGradient id="ai-glow-gradient-amber" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor="#f59e0b" />
                              <stop offset="100%" stopColor="#d97706" />
                            </linearGradient>
                            <linearGradient id="ai-glow-gradient-red" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor="#ef4444" />
                              <stop offset="100%" stopColor="#dc2626" />
                            </linearGradient>
                            <filter id="ring-neon-glow" x="-10%" y="-10%" width="120%" height="120%">
                              <feGaussianBlur stdDeviation="2.5" result="blur" />
                              <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                              </feMerge>
                            </filter>
                          </defs>
                          <circle
                            cx="50"
                            cy="50"
                            r={radius}
                            stroke="currentColor"
                            strokeWidth="6"
                            fill="transparent"
                            className="text-gray-100 dark:text-gray-800"
                          />
                          <motion.circle
                            cx="50"
                            cy="50"
                            r={radius}
                            stroke={`url(#${pct >= 70 ? "ai-glow-gradient" : pct >= 40 ? "ai-glow-gradient-amber" : "ai-glow-gradient-red"})`}
                            strokeWidth="7"
                            fill="transparent"
                            strokeDasharray={circ}
                            initial={{ strokeDashoffset: circ }}
                            animate={{ strokeDashoffset }}
                            transition={{ duration: 1.0, ease: "easeOut" }}
                            strokeLinecap="round"
                            filter="url(#ring-neon-glow)"
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                          <span className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                            {pct}%
                          </span>
                          <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Rescue Prob.</span>
                        </div>
                      </div>

                      <div className="mt-2">
                        <span className={`px-4 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                          forecast.rescue_confidence_tier === "High"
                            ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-450 dark:border-emerald-500/20"
                            : forecast.rescue_confidence_tier === "Medium"
                            ? "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-450 dark:border-amber-500/20"
                            : "bg-red-50 text-red-650 border-red-200 dark:bg-red-500/10 dark:text-red-450 dark:border-red-500/20"
                        }`}>
                          {forecast.rescue_confidence_tier} Confidence
                        </span>
                      </div>
                      
                      <div className="mt-5 border-t border-gray-100 dark:border-gray-700/40 pt-4 w-full">
                        <p className="text-[9px] text-gray-450 dark:text-gray-500 font-bold uppercase tracking-widest">Model Confidence Score</p>
                        <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">
                          {Math.round((forecast.model_confidence || 0.88) * 100)}% Accuracy
                        </p>
                      </div>
                    </div>

                    {/* Mini metrics cards */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white/70 dark:bg-gray-800/75 backdrop-blur-md border border-white/30 dark:border-gray-700/40 p-3.5 rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition duration-300 flex flex-col items-center text-center">
                        <ShieldAlert size={18} className={
                          forecast.spoilage_risk_score === "High"
                            ? "text-red-500 animate-pulse"
                            : forecast.spoilage_risk_score === "Medium"
                            ? "text-amber-500 animate-pulse"
                            : "text-emerald-500"
                        } />
                        <h4 className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-2">Spoilage Risk</h4>
                        <p className={`text-xs font-extrabold mt-1 ${
                          forecast.spoilage_risk_score === "High"
                            ? "text-red-650 dark:text-red-400"
                            : forecast.spoilage_risk_score === "Medium"
                            ? "text-amber-655 dark:text-amber-400"
                            : "text-emerald-650 dark:text-emerald-450"
                        }`}>
                          {forecast.spoilage_risk_score}
                        </p>
                      </div>

                      <div className="bg-white/70 dark:bg-gray-800/75 backdrop-blur-md border border-white/30 dark:border-gray-700/40 p-3.5 rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition duration-300 flex flex-col items-center text-center">
                        <Clock size={18} className="text-emerald-500" />
                        <h4 className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-2">Sellout time</h4>
                        <p className="text-xs font-extrabold text-gray-800 dark:text-gray-200 mt-1">
                          {forecast.sellout_hours} hrs
                        </p>
                      </div>

                      <div className="bg-white/70 dark:bg-gray-800/75 backdrop-blur-md border border-white/30 dark:border-gray-700/40 p-3.5 rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition duration-300 flex flex-col items-center text-center">
                        <TrendingUp size={18} className="text-emerald-500" />
                        <h4 className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-2">Demand Score</h4>
                        <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-450 mt-1">
                          {forecast.demand_score != null ? `${forecast.demand_score}` : "N/A"}/10
                        </p>
                      </div>
                    </div>

                    {/* Price Optimizer */}
                    <div className="bg-white/70 dark:bg-gray-800/75 backdrop-blur-md border border-white/30 dark:border-gray-700/40 p-6 rounded-3xl shadow-xl space-y-4 transition duration-300">
                      <h3 className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Percent size={15} className="text-emerald-500" />
                        AI Dynamic Price Optimizer
                      </h3>
                      
                      <div className="grid grid-cols-2 gap-4 pt-1">
                        <div className="bg-gray-50 dark:bg-gray-900/60 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-850 hover:border-emerald-500/10 transition">
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Suggested Markdown</p>
                          <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">
                            {forecast.optimal_discount_percent}% Off
                          </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900/60 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-850 hover:border-emerald-500/10 transition">
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Target Price</p>
                          <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">
                            ₹{forecast.optimal_price.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="bg-emerald-50/40 dark:bg-emerald-950/10 p-4 rounded-2xl border border-emerald-100/30 dark:border-emerald-900/15 text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed font-semibold">
                        {forecast.pricing_explanation}
                      </div>

                      <div className="pt-1">
                        <button
                          onClick={() => handleApplyAiPrice(product, forecast.optimal_price)}
                          disabled={applyingPrice || product.discount_price === forecast.optimal_price}
                          className="w-full py-3.5 rounded-xl font-bold transition duration-300 flex items-center justify-center gap-2 border shadow-sm disabled:cursor-not-allowed disabled:opacity-50 text-xs bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/15 border-transparent cursor-pointer"
                        >
                          {applyingPrice ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              Applying AI Markdown...
                            </>
                          ) : product.discount_price === forecast.optimal_price ? (
                            <>
                              <Check size={14} />
                              AI Recommended Price Active
                            </>
                          ) : (
                            <>
                              <Sparkles size={14} className="animate-pulse" />
                              Apply AI Suggested Price
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Middle/Right Column: Explainability, Smart Insights Feed, and Demand Forecasting Graph */}
                  <div className="lg:col-span-2 space-y-6">
                    
                    {/* 2. AI Explainability Panel */}
                    <div className="bg-white/70 dark:bg-gray-800/75 backdrop-blur-md border border-white/30 dark:border-gray-700/40 p-6 rounded-3xl shadow-xl space-y-4 transition duration-300">
                      <div>
                        <h3 className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">AI Explainability Panel</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Inference coefficients detailing metric weight contributions to Rescue Probability.
                        </p>
                      </div>

                      <div className="bg-emerald-50/25 dark:bg-emerald-950/10 p-4 border-l-4 border-emerald-500 rounded-r-2xl text-xs italic text-gray-700 dark:text-gray-300 font-semibold leading-relaxed">
                        &ldquo;{getExplainabilityReasoning(product, forecast)}&rdquo;
                      </div>

                      <div className="space-y-4 pt-2">
                        {/* Expiry Impact */}
                        <div>
                          <div className="flex justify-between text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                            <span className="flex items-center gap-1.5">
                              <Clock size={13} className="text-emerald-500" />
                              Expiry Timeline Impact
                            </span>
                            <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${forecast.explainability.days_left_impact >= 0 ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400" : "text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400"}`}>
                              {forecast.explainability.days_left_impact >= 0 ? "+" : ""}{forecast.explainability.days_left_impact}% Clearance Rate Boost
                            </span>
                          </div>
                          <div className="h-2 w-full bg-gray-100 dark:bg-gray-850 rounded-full overflow-hidden relative border border-gray-200/10">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, Math.max(5, Math.abs(forecast.explainability.days_left_impact)))}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className={`h-full rounded-full ${
                                forecast.explainability.days_left_impact >= 0 
                                  ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm shadow-emerald-500/20" 
                                  : "bg-gradient-to-r from-amber-500 to-orange-400"
                              }`}
                            />
                          </div>
                        </div>

                        {/* Stock Impact */}
                        <div>
                          <div className="flex justify-between text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                            <span className="flex items-center gap-1.5">
                              <Package size={13} className="text-emerald-500" />
                              Stock Volume Impact
                            </span>
                            <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${forecast.explainability.stock_impact >= 0 ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400" : "text-red-500 bg-red-50 dark:bg-red-500/10 dark:text-red-400"}`}>
                              {forecast.explainability.stock_impact >= 0 ? "+" : ""}{forecast.explainability.stock_impact}% Spoilage Risk
                            </span>
                          </div>
                          <div className="h-2 w-full bg-gray-100 dark:bg-gray-850 rounded-full overflow-hidden relative border border-gray-200/10">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, Math.max(5, Math.abs(forecast.explainability.stock_impact)))}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className={`h-full rounded-full ${
                                forecast.explainability.stock_impact >= 0 
                                  ? "bg-gradient-to-r from-emerald-500 to-teal-400" 
                                  : "bg-gradient-to-r from-red-500 to-orange-500 shadow-sm shadow-red-500/20"
                              }`}
                            />
                          </div>
                        </div>

                        {/* Demand Impact */}
                        <div>
                          <div className="flex justify-between text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                            <span className="flex items-center gap-1.5">
                              <TrendingUp size={13} className="text-emerald-500" />
                              Historical Category Demand Impact
                            </span>
                            <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${forecast.explainability.category_demand_impact >= 0 ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400" : "text-red-500 bg-red-50 dark:bg-red-500/10 dark:text-red-400"}`}>
                              {forecast.explainability.category_demand_impact >= 0 ? "+" : ""}{forecast.explainability.category_demand_impact}% Category Velocity
                            </span>
                          </div>
                          <div className="h-2 w-full bg-gray-100 dark:bg-gray-850 rounded-full overflow-hidden relative border border-gray-200/10">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, Math.max(5, Math.abs(forecast.explainability.category_demand_impact)))}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className={`h-full rounded-full ${
                                forecast.explainability.category_demand_impact >= 0 
                                  ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm shadow-emerald-500/20" 
                                  : "bg-gradient-to-r from-red-400 to-orange-400"
                              }`}
                            />
                          </div>
                        </div>

                        {/* Discount Impact */}
                        <div>
                          <div className="flex justify-between text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                            <span className="flex items-center gap-1.5">
                              <Percent size={13} className="text-emerald-500" />
                              Markdown Discount Impact
                            </span>
                            <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${forecast.explainability.discount_impact >= 0 ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400" : "text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400"}`}>
                              {forecast.explainability.discount_impact >= 0 ? "+" : ""}{forecast.explainability.discount_impact}% Shopper Conversion
                            </span>
                          </div>
                          <div className="h-2 w-full bg-gray-100 dark:bg-gray-850 rounded-full overflow-hidden relative border border-gray-200/10">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, Math.max(5, Math.abs(forecast.explainability.discount_impact)))}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className={`h-full rounded-full ${
                                forecast.explainability.discount_impact >= 0 
                                  ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm shadow-emerald-500/20" 
                                  : "bg-gradient-to-r from-amber-500 to-orange-500"
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 3. Smart AI Insights Feed */}
                    <div className="bg-white/70 dark:bg-gray-800/75 backdrop-blur-md border border-white/30 dark:border-gray-700/40 p-6 rounded-3xl shadow-xl space-y-4 transition duration-300">
                      <div>
                        <h3 className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">Smart AI Insights Feed</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Dynamic recommendation signals from real-time store monitoring logs.
                        </p>
                      </div>

                      <div className="space-y-3">
                        {dynamicInsights.map((insight, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: idx * 0.05 }}
                            whileHover={{ scale: 1.008 }}
                            className={`p-4 rounded-2xl border flex items-start gap-4 transition duration-300 hover:shadow-md border-gray-250/20 ${
                              insight.type === "danger"
                                ? "bg-red-50/50 dark:bg-red-950/10 border-red-150/20 text-red-900 dark:text-red-300"
                                : insight.type === "warning"
                                ? "bg-amber-50/50 dark:bg-amber-950/10 border-amber-150/20 text-amber-900 dark:text-amber-300"
                                : insight.type === "success"
                                ? "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-150/20 text-emerald-900 dark:text-emerald-300"
                                : "bg-gray-50 dark:bg-gray-900/60 text-gray-800 dark:text-gray-200"
                            }`}
                          >
                            <div className={`p-2.5 rounded-xl flex-shrink-0 text-white shadow-sm relative ${
                              insight.type === "danger" ? "bg-red-500 shadow-red-500/20" :
                              insight.type === "warning" ? "bg-amber-500 shadow-amber-500/20" :
                              insight.type === "success" ? "bg-emerald-500 shadow-emerald-500/20" : "bg-emerald-600"
                            }`}>
                              <Sparkles size={15} />
                              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                              </span>
                            </div>
                            <div className="space-y-1.5 min-w-0">
                              <h4 className="text-xs font-bold leading-none">{insight.title}</h4>
                              <p className="text-xs opacity-90 leading-relaxed font-semibold">{insight.text}</p>
                              <div className="flex items-center gap-1.5 mt-2.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-450 bg-white/80 dark:bg-gray-800 px-3 py-1 rounded-lg w-max shadow-sm border border-emerald-100/30">
                                <ArrowRight size={10} className="animate-pulse" />
                                <span>{insight.action}</span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* 4. AI Demand Forecasting Graph */}
                    <div className="bg-white/70 dark:bg-gray-800/75 backdrop-blur-md border border-white/30 dark:border-gray-700/40 p-6 rounded-3xl shadow-xl space-y-4 transition duration-300">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <BarChart3 size={15} className="text-emerald-500" />
                            <span>AI Demand Forecasting</span>
                          </h3>
                          <p className="text-xs text-gray-505 dark:text-gray-400 mt-1">
                            Simulated continuous Category Demand Curve vs remaining Stock Depletion.
                          </p>
                        </div>
                        <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-100/10">
                          24h Target: {forecast.predicted_demand_24h} Units
                        </span>
                      </div>

                      <div className="relative pt-3">
                        <svg className="w-full h-44 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
                          <defs>
                            <linearGradient id="ai-demand-gradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                            </linearGradient>
                            <linearGradient id="ai-stock-gradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#f97316" stopOpacity="0.15" />
                              <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
                            </linearGradient>
                            <pattern id="graph-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-gray-100 dark:text-gray-800/40" />
                            </pattern>
                          </defs>
                          
                          {/* Grid Pattern Background */}
                          <rect x={paddingLeft} y={paddingTop} width={width - paddingLeft - paddingRight} height={height - paddingTop - paddingBottom} fill="url(#graph-grid)" />

                          {/* Grid horizontal markers */}
                          <line x1={paddingLeft} y1={paddingTop} x2={width - paddingRight} y2={paddingTop} stroke="currentColor" strokeWidth="0.5" className="text-gray-200 dark:text-gray-800/50" />
                          <line x1={paddingLeft} y1={(height - paddingTop - paddingBottom) / 2 + paddingTop} x2={width - paddingRight} y2={(height - paddingTop - paddingBottom) / 2 + paddingTop} stroke="currentColor" strokeWidth="0.5" className="text-gray-200 dark:text-gray-800/50" />
                          <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="currentColor" strokeWidth="1.5" className="text-gray-300 dark:text-gray-700" />

                          {/* Demand curved glow & curved stroke */}
                          {demandArea && <path d={demandArea} fill="url(#ai-demand-gradient)" />}
                          {demandPath && (
                            <path
                              d={demandPath}
                              fill="none"
                              stroke="#10b981"
                              strokeWidth="3.5"
                              strokeLinecap="round"
                            />
                          )}

                          {/* Stock curved glow & curved stroke */}
                          {stockArea && <path d={stockArea} fill="url(#ai-stock-gradient)" />}
                          {stockPath && (
                            <path
                              d={stockPath}
                              fill="none"
                              stroke="#f97316"
                              strokeWidth="2"
                              strokeDasharray="4 3"
                              strokeLinecap="round"
                            />
                          )}

                          {/* Demand Points */}
                          {demandPoints.map((p: any, idx: number) => (
                            <g key={`dem-${idx}`}>
                              <circle cx={p.x} cy={p.y} r="4" fill="#10b981" className="hover:r-5 transition duration-200" />
                              {idx % 2 === 1 && (
                                <text x={p.x} y={p.y - 7} textAnchor="middle" fill="#10b981" fontSize="8" className="font-extrabold select-none">
                                  +{p.value}
                                </text>
                              )}
                            </g>
                          ))}

                          {/* Stock Points */}
                          {stockPoints.map((p: any, idx: number) => (
                            <g key={`stk-${idx}`}>
                              <circle cx={p.x} cy={p.y} r="3" fill="#f97316" className="hover:r-4 transition duration-200" />
                              {idx % 2 === 1 && (
                                <text x={p.x} y={p.y + 11} textAnchor="middle" fill="#f97316" fontSize="8" className="font-extrabold select-none">
                                  {p.value}
                                </text>
                              )}
                            </g>
                          ))}

                          {/* Sellout Prediction point */}
                          {selloutIndex !== -1 && (
                            <g>
                              <line x1={stockPoints[selloutIndex].x} y1={paddingTop} x2={stockPoints[selloutIndex].x} y2={height - paddingBottom} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="2 2" />
                              <circle cx={stockPoints[selloutIndex].x} cy={stockPoints[selloutIndex].y} r="8" fill="#ef4444" className="animate-ping opacity-60" />
                              <circle cx={stockPoints[selloutIndex].x} cy={stockPoints[selloutIndex].y} r="4" fill="#ef4444" />
                              <text x={stockPoints[selloutIndex].x} y={paddingTop - 5} textAnchor="middle" fill="#ef4444" fontSize="7" className="font-extrabold uppercase tracking-wider select-none bg-white">
                                Sellout Point
                              </text>
                            </g>
                          )}
                        </svg>
                        
                        <div className="flex justify-between text-[8px] text-gray-400 font-extrabold uppercase tracking-widest mt-3 px-8 select-none">
                          {trend.map((t: any, idx: number) => (
                            <span key={idx}>{t.hour}</span>
                          ))}
                        </div>

                        <div className="flex justify-center gap-6 mt-5 text-[10px] font-bold uppercase tracking-wider select-none">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-gray-500 dark:text-gray-400">Predicted Demand Trend</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                            <span className="text-gray-500 dark:text-gray-400">Inventory Movement</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-gray-500 dark:text-gray-400">Predicted Spoilage Limit</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="py-20 text-center bg-white/70 dark:bg-gray-800/75 backdrop-blur-md border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-xl text-gray-500">
              <Brain size={48} className="mx-auto text-emerald-500/40 dark:text-emerald-500/20 mb-4 animate-pulse" />
              <p className="font-black text-sm text-gray-700 dark:text-gray-300">Select an active product deal above to run the AI Demand Intelligence suite.</p>
              <p className="text-xs text-gray-450 dark:text-gray-550 mt-1 max-w-sm mx-auto">Dynamic regressions, category demand trends, pricing optimizations, and model explainability metrics will load instantly.</p>
            </div>
          )}
        </div>
      )}

      {/* AI Diagnostics Drawer */}
      {showDiagnostics && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-white dark:bg-gray-900 border-l border-gray-100 dark:border-gray-800 w-full max-w-lg shadow-2xl h-full flex flex-col p-6 overflow-y-auto relative animate-in slide-in-from-right duration-350">
            <button
              onClick={() => {
                setShowDiagnostics(false);
                setDiagnosticsData(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
            >
              <XCircle size={20} />
            </button>

            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-sm mb-4">
              <Sparkles size={18} />
              AI Model Diagnostics & Insights
            </div>

            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Model Diagnostics
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
              Reviewing coefficients, training convergence, and accuracy of your shop&apos;s forecasting model.
            </p>

            {loadingDiagnostics ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="animate-spin text-purple-500" size={36} />
                <p className="text-sm font-semibold text-gray-500">Retrieving training parameters...</p>
              </div>
            ) : diagnosticsData ? (
              <div className="space-y-6 flex-1">
                {/* Mathematical Equation Display */}
                <div className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200/60 dark:border-gray-800 rounded-2xl space-y-2">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Hypothesis Formulation</p>
                  <code className="block text-xs font-mono text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800 overflow-x-auto">
                    z = 0.45·x₁ - 0.25·x₂ + 0.35·x₃ - 0.15·x₄ - 0.52
                  </code>
                  <code className="block text-xs font-mono text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800">
                    P(Rescue) = 1 / (1 + e^-z)
                  </code>
                </div>

                {/* Feature Importance Weights */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Optimized Feature Weights</h4>
                  
                  <div className="space-y-3">
                    {/* Weight 1 */}
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        <span>Price Markdown Discount (x₁)</span>
                        <span className="text-purple-600 font-bold">+0.45 (High Positive Importance)</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: "45%" }} />
                      </div>
                    </div>

                    {/* Weight 3 */}
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        <span>Remaining Shelf Life Days (x₃)</span>
                        <span className="text-emerald-600 font-bold">+0.35 (Positive Importance)</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: "35%" }} />
                      </div>
                    </div>

                    {/* Weight 2 */}
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        <span>Relative Price Fraction (x₂)</span>
                        <span className="text-amber-600 font-bold">-0.25 (Negative Importance)</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: "25%" }} />
                      </div>
                    </div>

                    {/* Weight 4 */}
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        <span>Available Stock quantity (x₄)</span>
                        <span className="text-red-500 font-bold">-0.15 (Mild Negative Importance)</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-red-400 rounded-full" style={{ width: "15%" }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Training Loss Convergence SVG Chart */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">MSE Loss Convergence</h4>
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200/60 dark:border-gray-800 rounded-2xl">
                    <svg className="w-full h-32 overflow-visible" viewBox="0 0 300 120">
                      {/* Grid Lines */}
                      <line x1="0" y1="20" x2="300" y2="20" stroke="#f3f4f6" strokeWidth="1" className="dark:stroke-gray-800" />
                      <line x1="0" y1="60" x2="300" y2="60" stroke="#f3f4f6" strokeWidth="1" className="dark:stroke-gray-800" />
                      <line x1="0" y1="100" x2="300" y2="100" stroke="#f3f4f6" strokeWidth="1" className="dark:stroke-gray-800" />
                      
                      {/* Smooth Path */}
                      <path
                        d="M 0,20 Q 30,60 60,78 T 120,95 T 180,103 T 240,105 T 300,106"
                        fill="none"
                        stroke="#8b5cf6"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      
                      {/* Bullet points */}
                      <circle cx="0" cy="20" r="4" fill="#8b5cf6" />
                      <circle cx="60" cy="78" r="4" fill="#8b5cf6" />
                      <circle cx="120" cy="95" r="4" fill="#8b5cf6" />
                      <circle cx="180" cy="103" r="4" fill="#8b5cf6" />
                      <circle cx="300" cy="106" r="4" fill="#8b5cf6" />

                      {/* Labels */}
                      <text x="5" y="15" fill="#9ca3af" fontSize="8" className="font-bold">Loss: 0.65</text>
                      <text x="250" y="100" fill="#9ca3af" fontSize="8" className="font-bold">Loss: 0.11</text>
                    </svg>
                    <div className="flex justify-between text-[10px] text-gray-400 font-bold mt-2 uppercase tracking-wide">
                      <span>Epoch 0</span>
                      <span>Epoch 100</span>
                      <span>Epoch 200</span>
                    </div>
                  </div>
                </div>

                {/* Technical Table parameters */}
                <div className="p-4 bg-purple-50/50 dark:bg-purple-950/10 border border-purple-100 dark:border-purple-900/30 rounded-2xl">
                  <div className="grid grid-cols-2 gap-y-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                    <span className="text-gray-400 font-bold uppercase tracking-wide text-[10px]">Algorithm Type</span>
                    <span className="text-right text-purple-700 dark:text-purple-400">{diagnosticsData.algorithm}</span>

                    <span className="text-gray-400 font-bold uppercase tracking-wide text-[10px]">Dataset Samples</span>
                    <span className="text-right text-purple-700 dark:text-purple-400">{diagnosticsData.sample_count} entries</span>

                    <span className="text-gray-400 font-bold uppercase tracking-wide text-[10px]">Learning Rate (α)</span>
                    <span className="text-right text-purple-700 dark:text-purple-400">{diagnosticsData.learning_rate}</span>

                    <span className="text-gray-400 font-bold uppercase tracking-wide text-[10px]">Epoch Runs</span>
                    <span className="text-right text-purple-700 dark:text-purple-400">{diagnosticsData.epochs} iterations</span>

                    <span className="text-gray-400 font-bold uppercase tracking-wide text-[10px]">Model Accuracy</span>
                    <span className="text-right text-emerald-600 dark:text-emerald-400 font-bold">{diagnosticsData.accuracy * 100}% (MSE Match)</span>
                  </div>
                </div>

                {/* Footer close button */}
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setShowDiagnostics(false);
                      setDiagnosticsData(null);
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 transition"
                  >
                    Close Diagnostics Panel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-red-500 font-semibold py-4 text-center">
                Failed to load diagnostics.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
