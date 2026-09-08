"use client";

import { useState, useRef, useEffect } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogIn,
  MapPin,
  Package,
  RefreshCw,
  Search,
  LogOut,
  User,
  Bell,
  ChevronDown,
  Leaf,
  SlidersHorizontal,
  X,
  Truck,
  Phone,
  ShoppingBag,
  Loader2,
  Heart,
  QrCode,
  ShieldCheck,
  CreditCard,
  Trophy,
  ChefHat,
  Sparkles
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { useAuth } from "@/contexts/AuthenticationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { DealProductCard } from "@/components/products/DealProductCard";
import { DealProductSkeleton } from "@/components/products/DealProductSkeleton";
import { getErrorMessage } from "@/api/errors";
import { useProducts } from "@/hooks/useProducts";
import { useWebSocket } from "@/hooks/useWebSocket";
import { buildDealProductCardProps } from "@/lib/products/map-deal-product";
import { createOrder } from "@/services/orders";
import { createReservation } from "@/services/reservations";
import { addFavorite, removeFavorite, getFavorites, getRecommendedProducts, getDeepSearchResults, generateRecipe, type ApiRecipeSearchResponse, type ApiRecipeResponse } from "@/services/products";
import { getMyFollowing, followShop, unfollowShop } from "@/services/shops";
import { ShopperLayout } from "@/components/layout/ShopperLayout";
import { LiveDealTicker } from "@/components/ui/LiveDealTicker";
import type { ProductCategory, ApiProduct } from "@/types/product";
import { fetchIpGeolocation } from "@/lib/geolocation";

const FILTERS = ["All", "AI Recommended ✨", "Saved ❤️", "BAKERY", "DAIRY", "PRODUCE", "MEAT", "PANTRY", "PREPARED_FOOD", "OTHER"];

export default function CustomerDealsPage() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showGoTop, setShowGoTop] = useState(false);
  const [orderSuccessDetails, setOrderSuccessDetails] = useState<{
    id: string;
    name: string;
    shopName: string;
    shopAddress?: string;
    price: number;
    pickupCode: string;
    type: "PICKUP" | "DELIVERY";
  } | null>(null);

  useEffect(() => {
    const handleScroll = () => setShowGoTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const [recipeBasket, setRecipeBasket] = useState<Set<string>>(new Set());
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<ApiRecipeResponse | null>(null);
  const [showRecipeModal, setShowRecipeModal] = useState(false);

  const handleToggleRecipeBasket = (productId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRecipeBasket(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const [activeFilter, setActiveFilter] = useState("All");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [following, setFollowing] = useState<Set<string>>(new Set());

  // Deep search states
  const [showFilters, setShowFilters] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const [minDiscount, setMinDiscount] = useState<number | "">("");
  const [radiusKm, setRadiusKm] = useState<number>(50);
  const [expiryUrgency, setExpiryUrgency] = useState<string>("any");
  const [semanticSearch, setSemanticSearch] = useState(false);
  const [recipeMode, setRecipeMode] = useState(false);

  // Order options modal states
  const [selectedProductForOrder, setSelectedProductForOrder] = useState<ApiProduct | null>(null);
  const [orderType, setOrderType] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [deliveryName, setDeliveryName] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [paymentStep, setPaymentStep] = useState<"options" | "upi">("options");

  const [recommendedProducts, setRecommendedProducts] = useState<ApiProduct[]>([]);
  const [loadingRecommended, setLoadingRecommended] = useState(false);

  useEffect(() => {
    if (activeFilter === "AI Recommended ✨") {
      setLoadingRecommended(true);
      getRecommendedProducts()
        .then(setRecommendedProducts)
        .catch(console.error)
        .finally(() => setLoadingRecommended(false));
    }
  }, [activeFilter]);

  useEffect(() => {
    if (user) {
      setDeliveryName(user.name);
    }
  }, [user]);

  const isDeepSearchActive = semanticSearch || recipeMode || maxPrice !== "" || minDiscount !== "" || radiusKm !== 50 || expiryUrgency !== "any";

  const deepSearchKey = isDeepSearchActive ? {
    _key: "deepSearch",
    q: search || undefined,
    semantic: semanticSearch,
    recipeMode: recipeMode,
    maxPrice: maxPrice !== "" ? Number(maxPrice) : undefined,
    minDiscountPct: minDiscount !== "" ? Number(minDiscount) : undefined,
    expiryUrgency: expiryUrgency !== "any" ? expiryUrgency : undefined,
    lat,
    lng,
    radiusKm: radiusKm
  } : null;

  const { data: deepSearchData, error: deepSearchError, isLoading: deepSearchLoading, mutate: mutateDeepSearch } = useSWR(
    deepSearchKey,
    (params) => getDeepSearchResults(params),
    { refreshInterval: 15000 }
  );

  const { products: standardProducts, status: standardStatus, errorMessage: standardErrorMessage, refetch: refetchStandard } = useProducts({ 
    hideExpired: true,
    q: search || undefined,
    category: (activeFilter === "All" || activeFilter === "AI Recommended ✨") ? undefined : (activeFilter as ProductCategory),
    lat,
    lng,
    radius_km: lat ? 50 : undefined
  });

  // Real-time synchronization across Web and Mobile
  useWebSocket(() => {
    refetchStandard();
    if (isDeepSearchActive) {
      mutateDeepSearch();
    }
  });

  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Fetch favorites on load
  useEffect(() => {
    if (user) {
      getFavorites().then(favs => {
        setFavorites(new Set(favs.map(f => f.product_id)));
      }).catch(console.error);
      
      getMyFollowing().then(fols => {
        setFollowing(new Set(fols.map(f => f.shop_id)));
      }).catch(console.error);
    }
  }, [user]);

  // Auto IP Geolocation on mount
  useEffect(() => {
    fetchIpGeolocation()
      .then((data) => {
        setLat(data.latitude);
        setLng(data.longitude);
      })
      .catch((err) => console.error("Auto IP location failed:", err));
  }, []);

  const handleToggleFavorite = async (id: string, isFav: boolean, e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      router.push("/auth?role=customer&tab=login");
      return;
    }
    try {
      if (isFav) {
        await removeFavorite(id);
        setFavorites(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        await addFavorite(id);
        setFavorites(prev => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });
      }
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleToggleFollow = async (shopId: string, isFollowing: boolean, e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      router.push("/auth?role=customer&tab=login");
      return;
    }
    try {
      if (isFollowing) {
        await unfollowShop(shopId);
        setFollowing(prev => {
          const next = new Set(prev);
          next.delete(shopId);
          return next;
        });
      } else {
        await followShop(shopId);
        setFollowing(prev => {
          const next = new Set(prev);
          next.add(shopId);
          return next;
        });
      }
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleTogglePlay = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    setPlayingId((prev) => (prev === id ? null : id));
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const handleReserve = (productId: string) => {
    if (!user) {
      router.push("/auth?role=customer&tab=login");
      return;
    }
    const found = (isDeepSearchActive && deepSearchData ? (deepSearchData.recipe_mode ? deepSearchData.matched_deals : deepSearchData.products) : standardProducts).find((p) => p.id === productId);
    if (found) {
      setSelectedProductForOrder(found);
      setOrderType("PICKUP");
      setPaymentStep("options");
      setDeliveryName(user.name);
      setDeliveryPhone("");
      setDeliveryAddress("");
    }
  };

  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForOrder) return;
    
    setIsPlacingOrder(true);
    try {
      const price = selectedProductForOrder.current_price || selectedProductForOrder.discount_price || 0;
      const res = await createReservation(selectedProductForOrder.id, 1);

      setOrderSuccessDetails({
        id: res.id,
        name: selectedProductForOrder.name,
        shopName: res.product?.shop?.name ?? selectedProductForOrder.shop?.name ?? "Local Shop",
        shopAddress: res.product?.shop?.address ?? selectedProductForOrder.shop?.address ?? "Store Counter",
        price: res.total_price || price,
        pickupCode: res.pickup_code,
        type: "PICKUP"
      });
      setSelectedProductForOrder(null);
      void refetchStandard();
      if (isDeepSearchActive) {
        void mutateDeepSearch();
      }
    } catch (err) {
      alert("Failed to confirm reservation: " + getErrorMessage(err));
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleQuickRecipe = async (productId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const product = (isDeepSearchActive && deepSearchData ? (deepSearchData.recipe_mode ? deepSearchData.matched_deals : deepSearchData.products) : standardProducts).find(p => p.id === productId);
    if (!product) return;
    
    setIsGeneratingRecipe(true);
    setShowRecipeModal(true);
    setGeneratedRecipe(null);
    try {
      const recipe = await generateRecipe([{ name: product.name, category: product.category }]);
      setGeneratedRecipe(recipe);
    } catch (err) {
      alert("Failed to generate recipe: " + getErrorMessage(err));
      setShowRecipeModal(false);
    } finally {
      setIsGeneratingRecipe(false);
    }
  };

  const handleGenerateRecipe = async () => {
    if (recipeBasket.size === 0) return;
    
    setIsGeneratingRecipe(true);
    setShowRecipeModal(true);
    setGeneratedRecipe(null);
    
    try {
      const selectedProducts = Array.from(recipeBasket).map(id => {
        const found = standardProducts.find(p => p.id === id);
        if (found) return found;
        if (isDeepSearchActive && deepSearchData) {
          const list = deepSearchData.recipe_mode ? deepSearchData.matched_deals : deepSearchData.products;
          const deepFound = list.find((p: any) => p.id === id);
          if (deepFound) return deepFound;
        }
        return null;
      }).filter(Boolean);
      
      const payload = selectedProducts.map(p => ({
        name: p!.name,
        category: p!.category,
      }));
      
      const recipe = await generateRecipe(payload);
      setGeneratedRecipe(recipe);
    } catch (err) {
      alert("Failed to generate recipe: " + getErrorMessage(err));
      setShowRecipeModal(false);
    } finally {
      setIsGeneratingRecipe(false);
    }
  };

  const handleUseLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
        },
        (err) => {
          console.warn("GPS failed, falling back to IP geolocation:", err);
          fetchIpGeolocation()
            .then(data => {
              setLat(data.latitude);
              setLng(data.longitude);
            })
            .catch(() => alert("Could not get location. " + err.message));
        }
      );
    } else {
      fetchIpGeolocation()
        .then(data => {
          setLat(data.latitude);
          setLng(data.longitude);
        })
        .catch(() => alert("Geolocation is not supported by your browser."));
    }
  };

  const isAiRecommended = activeFilter === "AI Recommended ✨";
  const isSavedFilter = activeFilter === "Saved ❤️";
  const isRecipeResult = isDeepSearchActive && deepSearchData?.recipe_mode === true;
  const displayProducts = isAiRecommended
    ? recommendedProducts
    : isSavedFilter
    ? (isDeepSearchActive && deepSearchData
      ? (deepSearchData.recipe_mode ? deepSearchData.matched_deals : deepSearchData.products)
      : standardProducts).filter((p) => favorites.has(p.id))
    : isDeepSearchActive && deepSearchData
    ? (deepSearchData.recipe_mode ? deepSearchData.matched_deals : deepSearchData.products)
    : standardProducts;

  let displayStatus = "success";
  let errorMessage: string | null = null;
  
  if (isAiRecommended) {
    displayStatus = loadingRecommended ? "loading" : (recommendedProducts.length > 0 ? "success" : "empty");
  } else if (isDeepSearchActive) {
    if (deepSearchLoading && !deepSearchData) displayStatus = "loading";
    else if (deepSearchError) {
      displayStatus = "error";
      errorMessage = getErrorMessage(deepSearchError);
    } else if (deepSearchData) {
      const itemsCount = deepSearchData.recipe_mode ? deepSearchData.matched_deals.length : deepSearchData.products.length;
      displayStatus = itemsCount === 0 ? "empty" : "success";
    }
  } else {
    displayStatus = standardStatus;
    errorMessage = standardErrorMessage;
  }

  const showList = displayStatus === "success" && displayProducts.length > 0;
  const showEmpty =
    (displayStatus === "empty" || (displayStatus === "success" && displayProducts.length === 0));

  const initial = user?.name ? user.name[0].toUpperCase() : "?";

  return (
    <ShopperLayout>
      <div className="min-h-screen bg-gradient-to-b from-[#FFF5F0] via-[#F8F9FA] to-[#F1F5F9] dark:from-gray-950 dark:to-gray-900 pb-24 transition-colors">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-3xl border-b border-orange-100/60 dark:border-gray-800 px-4 lg:px-8 pt-3 pb-2.5 shadow-sm">
          <div className="w-full max-w-2xl lg:max-w-7xl mx-auto">
          {/* Top row: QR icon + ExpiryGo branding + Shopper role + notifications */}
          <div className="flex items-center justify-between mb-3">
            <Link
              href="/reservations"
              className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-gray-800 flex items-center justify-center text-slate-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-gray-700 transition border border-slate-200/60 dark:border-gray-700 shadow-sm"
              title="QR Pickup Code"
            >
              <QrCode size={20} />
            </Link>

            <div className="text-center">
              <h1 className="text-xl font-black text-slate-900 dark:text-white leading-none tracking-tight flex items-center justify-center gap-1">
                <span>🌱 Expiry<span className="text-[#FF5B26]">Go</span></span>
              </h1>
              <p className="text-[11px] font-semibold text-slate-400 dark:text-gray-400 leading-none mt-1">
                Rescue surplus quality food
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/profile"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50/80 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-800/40 rounded-xl text-[11px] font-black text-orange-700 dark:text-orange-300 shadow-sm"
              >
                <ShoppingBag size={13} className="text-[#FF5B26]" />
                Shopper
              </Link>

              <Link
                href="/notifications"
                className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-gray-800 flex items-center justify-center text-slate-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-gray-700 transition relative border border-slate-200/60 dark:border-gray-700 shadow-sm"
              >
                <Bell size={18} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-[#FF5B26] rounded-full ring-2 ring-white dark:ring-gray-900" />
              </Link>
            </div>
          </div>

          {/* Search bar + Recipe Generator Button Row */}
          <div className="flex gap-2 items-center">
            <div className="relative flex-1 bg-slate-100/90 dark:bg-gray-800/90 rounded-2xl border border-slate-200/80 dark:border-gray-700/80 flex items-center px-3.5 py-2.5 shadow-inner">
              <Search size={18} className="text-slate-400 mr-2.5 flex-shrink-0" />
              <input
                id="deals-search"
                type="search"
                placeholder="Search surplus food, groceries..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-800 dark:text-white placeholder:text-slate-400 outline-none font-semibold"
              />
              <Link href="/map" className="text-slate-400 hover:text-orange-500 transition ml-2">
                <MapPin size={18} />
              </Link>
            </div>

            {/* Orange Recipe Generator Button */}
            <Link
              href="/pantry"
              className="w-12 h-12 rounded-2xl bg-[#FF5B26] hover:bg-[#E54B18] text-white flex items-center justify-center shadow-lg shadow-orange-500/25 flex-shrink-0 transition active:scale-95"
              title="AI Recipe Generator"
            >
              <ChefHat size={22} />
            </Link>
          </div>

          {/* Circular Category Pills (Exact Mobile Match) */}
          <div className="flex justify-between items-center gap-2 mt-4 px-1 overflow-x-auto pb-1 scrollbar-hide">
            {[
              { id: "All", label: "All Deals", emoji: "🔥" },
              { id: "BAKERY", label: "Bakery", emoji: "🥐" },
              { id: "DAIRY", label: "Dairy", emoji: "🥛" },
              { id: "PRODUCE", label: "Produce", emoji: "🥗" },
              { id: "MEAT", label: "Meat", emoji: "🥩" },
            ].map((cat) => {
              const active = activeFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveFilter(cat.id)}
                  className="flex flex-col items-center gap-1.5 cursor-pointer group flex-1 min-w-[62px]"
                >
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all duration-200 border ${
                      active
                        ? "bg-orange-50 dark:bg-orange-950/60 border-[#FF5B26] shadow-md shadow-orange-500/20 scale-105"
                        : "bg-white dark:bg-gray-800 border-slate-200/80 dark:border-gray-700 shadow-sm group-hover:bg-slate-50"
                    }`}
                  >
                    {cat.emoji}
                  </div>
                  <span
                    className={`text-[11px] font-black tracking-tight ${
                      active
                        ? "text-[#FF5B26]"
                        : "text-slate-600 dark:text-gray-400 group-hover:text-slate-900"
                    }`}
                  >
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </div>
          
          {/* Advanced Collapsible Filter Drawer */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800/80 p-4 mt-3 space-y-4 shadow-inner">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Deep Search Filters</span>
                    <button
                      type="button"
                      onClick={() => {
                        setMaxPrice("");
                        setMinDiscount("");
                        setRadiusKm(50);
                        setExpiryUrgency("any");
                        setSemanticSearch(false);
                        setRecipeMode(false);
                      }}
                      className="text-[10px] font-bold text-red-500 hover:text-red-400 transition"
                    >
                      Clear All
                    </button>
                  </div>
                  
                  {/* Grid for Sliders */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Max Budget Slider */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                        Max Budget: {maxPrice !== "" ? `₹${maxPrice}` : "Any"}
                      </label>
                      <input
                        type="range"
                        min="50"
                        max="1000"
                        step="50"
                        value={maxPrice === "" ? "1000" : String(maxPrice)}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setMaxPrice(val === 1000 ? "" : val);
                        }}
                        className="w-full accent-emerald-500 bg-gray-200 dark:bg-gray-700 h-1 rounded-lg cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-gray-400 mt-1 font-bold">
                        <span>₹50</span>
                        <span>Any</span>
                      </div>
                    </div>

                    {/* Min Discount Slider */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                        Min Discount: {minDiscount !== "" ? `${minDiscount}% Off` : "Any"}
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="90"
                        step="10"
                        value={minDiscount === "" ? "10" : String(minDiscount)}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setMinDiscount(val === 10 ? "" : val);
                        }}
                        className="w-full accent-emerald-500 bg-gray-200 dark:bg-gray-700 h-1 rounded-lg cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-gray-400 mt-1 font-bold">
                        <span>Any</span>
                        <span>90%</span>
                      </div>
                    </div>

                    {/* Radius Distance Slider */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                        Distance Radius: {radiusKm === 50 ? "Any (50km)" : `${radiusKm} km`}
                      </label>
                      <input
                        type="range"
                        min="5"
                        max="100"
                        step="5"
                        value={radiusKm}
                        onChange={(e) => setRadiusKm(Number(e.target.value))}
                        className="w-full accent-emerald-500 bg-gray-200 dark:bg-gray-700 h-1 rounded-lg cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-gray-400 mt-1 font-bold">
                        <span>5 km</span>
                        <span>100 km</span>
                      </div>
                    </div>
                  </div>

                  {/* Urgency and AI features */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    {/* Expiry Urgency Select */}
                    <div className="bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 flex flex-col justify-between">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                        Expiry Urgency
                      </label>
                      <select
                        value={expiryUrgency}
                        onChange={(e) => setExpiryUrgency(e.target.value)}
                        className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 outline-none text-gray-900 dark:text-white font-medium"
                      >
                        <option value="any">Any Expiry</option>
                        <option value="today">Expiring Today (&lt;24h)</option>
                        <option value="tomorrow">Expiring Tomorrow (&lt;48h)</option>
                        <option value="week">Expiring This Week</option>
                      </select>
                    </div>

                    {/* AI Semantic Search Toggle */}
                    <div className="bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <label className="block text-[10px] font-bold text-gray-900 dark:text-white uppercase tracking-wider truncate">
                          AI Semantic
                        </label>
                        <span className="text-[9px] text-gray-400 block truncate">Intent search</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSemanticSearch(!semanticSearch);
                          if (recipeMode) setRecipeMode(false);
                        }}
                        className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none flex-shrink-0 ${
                          semanticSearch ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-700"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                            semanticSearch ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* AI Recipe Matcher Toggle */}
                    <div className="bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <label className="block text-[10px] font-bold text-gray-900 dark:text-white uppercase tracking-wider truncate">
                          Recipe Match
                        </label>
                        <span className="text-[9px] text-gray-400 block truncate">Bundle recipes</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setRecipeMode(!recipeMode);
                          if (semanticSearch) setSemanticSearch(false);
                        }}
                        className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none flex-shrink-0 ${
                          recipeMode ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-700"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                            recipeMode ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* ── Map quick-access banner ─────────────────────────────────── */}
      <div className="w-full max-w-2xl lg:max-w-7xl mx-auto px-4 lg:px-8 pt-4 space-y-3">
        {/* Monthly Savings Milestone Tracker */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 border border-emerald-500/20 rounded-[1.5rem] p-4 flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-600">
                <Trophy size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Monthly Milestone</p>
                <p className="text-sm font-black text-gray-900 dark:text-white leading-none">
                  You saved <span className="text-emerald-600">₹{(user.total_money_saved || 0).toFixed(0)}</span> this month!
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md uppercase tracking-wider">
                {Math.floor((user.total_items_saved || 0) / 10) + 1} Targets to go
              </span>
            </div>
          </motion.div>
        )}

        <div className="flex gap-2">
          <Link
            href="/map"
            className="flex-1 flex items-center gap-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-3 rounded-2xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-[1.01] transition-all"
          >
            <MapPin size={20} className="flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold leading-none">See deals on the map</p>
              <p className="text-xs opacity-80 mt-0.5">Find shops near you</p>
            </div>
            <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full hidden sm:block">Open Map →</span>
          </Link>
          <button
            onClick={handleUseLocation}
            className={`flex flex-col items-center justify-center border px-3 py-3 rounded-2xl shadow-sm transition flex-shrink-0 ${
              lat && lng
                ? "bg-emerald-500 text-white border-emerald-400"
                : "bg-white dark:bg-gray-800 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-gray-700"
            }`}
          >
            <MapPin size={18} className={lat && lng ? "text-white mb-0.5" : "text-emerald-500 mb-0.5"} />
            <span className={`text-[10px] font-bold ${lat && lng ? "text-white" : "text-gray-700 dark:text-gray-300"}`}>
              {lat && lng ? "Located" : "Nearby"}
            </span>
          </button>
        </div>

        {/* Location Required Alert for Radius Filter */}
        {radiusKm !== 50 && !lat && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3"
          >
            <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
              <MapPin size={18} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-amber-900">Location access needed</p>
              <p className="text-[10px] text-amber-700">Radius filtering requires your location to find nearby deals.</p>
            </div>
            <button
              onClick={handleUseLocation}
              className="text-xs font-black text-amber-900 bg-amber-200 px-3 py-1.5 rounded-lg"
            >
              Enable
            </button>
          </motion.div>
        )}
      </div>

      {/* ── Main content ────────────────────────────────────────────── */}
      <main className="p-4 lg:p-8 w-full max-w-2xl lg:max-w-7xl mx-auto space-y-6">
        {/* Flash Surplus Rescue Featured Hero Card */}
        <div className="relative rounded-[2rem] overflow-hidden bg-slate-900 text-white shadow-xl shadow-slate-900/15 p-5 flex flex-col justify-end min-h-[170px]">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&auto=format&fit=crop&q=80')] bg-cover bg-center opacity-60 mix-blend-luminosity" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-slate-900/40 z-10" />
          <div className="absolute top-4 left-4 z-20">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#FF5B26] text-white shadow-md shadow-orange-500/30">
              🔥 FLASH SURPLUS RESCUE
            </span>
          </div>

          <div className="relative z-20 mt-10">
            <h2 className="text-lg font-black text-white tracking-tight leading-tight">
              Artisan Butter Croissant (Pack of 4)
            </h2>
            <p className="text-xs text-slate-300 font-semibold mt-1">
              Save up to 70% &bull; Verified Store Freshness
            </p>
          </div>
        </div>

        {/* Popular Surplus Deals Section Title */}
        <div className="flex items-center justify-between pt-2">
          <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
            Popular Surplus Deals
          </h3>
          <button
            onClick={() => setActiveFilter("All")}
            className="text-xs font-bold text-[#FF5B26] hover:underline"
          >
            See All
          </button>
        </div>
        {/* AI Recipe Ingredient Matcher Card */}
        {isRecipeResult && deepSearchData && (() => {
          const recipeData = deepSearchData as ApiRecipeSearchResponse;
          return (
            <div className="mb-6 bg-white dark:bg-gray-900 border border-emerald-500/20 rounded-3xl p-5 shadow-xl relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-1.5 rounded-xl">
                  <ShoppingBag size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">Recipe Match Bundle</h3>
                  <h2 className="text-base font-black text-gray-900 dark:text-white mt-0.5">
                    {recipeData.recipe_name} Ingredients
                  </h2>
                </div>
              </div>
              
              <div className="space-y-2 mt-4 text-xs">
                <div className="flex flex-wrap gap-2">
                  {recipeData.ingredients.map((ing: string, i: number) => {
                    const isMatched = recipeData.matched_deals.some(
                      (p: any) => p.name.toLowerCase().includes(ing.toLowerCase()) || 
                                 (p.description && p.description.toLowerCase().includes(ing.toLowerCase()))
                    );
                    return (
                      <span
                        key={i}
                        className={`px-3 py-1.5 rounded-full font-bold text-[10px] tracking-wide uppercase transition ${
                          isMatched
                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-400 border border-transparent"
                        }`}
                      >
                        {isMatched ? "✅ " : "❌ "}
                        {ing}
                      </span>
                    );
                  })}
                </div>
                
                {recipeData.missing_ingredients.length > 0 && (
                  <p className="text-[10px] text-gray-400 italic mt-2 leading-relaxed">
                    Missing nearby: <span className="font-bold text-gray-500">{recipeData.missing_ingredients.join(", ")}</span>
                  </p>
                )}
                
                <div className="border-t border-gray-100 dark:border-gray-800 mt-4 pt-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Estimated Cost</p>
                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                      ₹{recipeData.estimated_total_cost.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Total Savings</p>
                    <span className="inline-block mt-0.5 text-xs font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-xl">
                      Save ₹{recipeData.total_savings.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {displayStatus === "loading" && (
          <div className="space-y-4 mt-4">
            {isDeepSearchActive && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center gap-3 py-4 text-emerald-600 dark:text-emerald-400"
              >
                <Loader2 size={18} className="animate-spin" />
                <span className="text-sm font-black uppercase tracking-widest">AI is analyzing nearby inventory...</span>
              </motion.div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <DealProductSkeleton key={i} />
              ))}
            </div>
          </div>
        )}

        {displayStatus === "error" && (
          <div className="py-12 text-center px-4">
            <p className="text-red-600 dark:text-red-400 text-sm mb-4">
              {errorMessage ?? getErrorMessage(new Error("Failed to load deals"))}
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Make sure the API is running:{" "}
              <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">uvicorn main:app --port 8000</code>
            </p>
            <button
              type="button"
              onClick={() => {
                void refetchStandard();
                if (isDeepSearchActive) {
                  void mutateDeepSearch();
                }
              }}
              className="inline-flex items-center gap-2 bg-emerald-600 text-white font-semibold px-4 py-2 rounded-xl"
            >
              <RefreshCw size={16} />
              Try again
            </button>
          </div>
        )}

        {showEmpty && (
          <div className="py-16 text-center text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-gray-900/50 border border-emerald-100/30 dark:border-gray-800 rounded-3xl p-8 backdrop-blur-md shadow-sm">
            {isSavedFilter ? (
              <>
                <Heart size={48} className="mx-auto text-red-500/80 dark:text-red-400 mb-4 fill-red-500/20" />
                <p className="font-bold text-gray-900 dark:text-white text-base">
                  {isDeepSearchActive ? "No saved matches." : "No saved deals yet."}
                </p>
                <p className="text-sm mt-1 max-w-sm mx-auto text-gray-500 dark:text-gray-400 leading-relaxed">
                  {isDeepSearchActive
                    ? "None of your favorites match the current deep search filters."
                    : "Tap the ❤️ icon on any deal to save it here for quick access later."}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (isDeepSearchActive) {
                      setMaxPrice("");
                      setMinDiscount("");
                      setRadiusKm(50);
                      setExpiryUrgency("any");
                      setSemanticSearch(false);
                      setRecipeMode(false);
                    } else {
                      setActiveFilter("All");
                    }
                  }}
                  className="mt-5 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-md shadow-emerald-500/10 cursor-pointer"
                >
                  {isDeepSearchActive ? "Clear Filters" : "Explore Active Deals"}
                </button>
              </>
            ) : (
              <>
                <Package size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="font-semibold text-gray-900 dark:text-white">
                  {isDeepSearchActive ? "No matching deals found." : "No active deals yet."}
                </p>
                <p className="text-sm mt-1">
                  {isDeepSearchActive
                    ? "Try adjusting your filters or search query."
                    : "Shops can add deals from the shopkeeper dashboard."}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    void refetchStandard();
                    if (isDeepSearchActive) {
                      void mutateDeepSearch();
                    }
                  }}
                  className="mt-4 inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition"
                >
                  <RefreshCw size={14} />
                  Refresh
                </button>
              </>
            )}
          </div>
        )}

        {showList && (
          <div className="space-y-4 mt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {displayProducts.length} deal{displayProducts.length !== 1 ? "s" : ""} available
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {displayProducts.map((product, index) => (
                <DealProductCard
                  key={product.id}
                  {...buildDealProductCardProps(product, index, playingId, handleTogglePlay, handleReserve, lat, lng)}
                  isFavorite={favorites.has(product.id)}
                  isFollowing={following.has(product.shop_id)}
                  onToggleFavorite={handleToggleFavorite}
                  onToggleFollow={handleToggleFollow}
                  isInRecipeBasket={recipeBasket.has(product.id)}
                  onToggleRecipeBasket={handleToggleRecipeBasket}
                  onQuickRecipe={handleQuickRecipe}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Store Pickup Reservation Modal */}
      {selectedProductForOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-[#FF5B26]">
                  <QrCode size={18} />
                </div>
                <h2 className="text-base font-black text-gray-900 dark:text-white">
                  Store Pickup Reservation
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProductForOrder(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-400"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmOrder} className="p-6 space-y-5">
              {/* Product preview */}
              <div className="flex items-center gap-3 p-3.5 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedProductForOrder.front_image_url}
                  className="w-14 h-14 rounded-xl object-cover border border-slate-200/80 dark:border-gray-700 shrink-0"
                  alt=""
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-gray-900 dark:text-white text-xs truncate">
                    {selectedProductForOrder.name}
                  </h4>
                  <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1 truncate">
                    <span>🏪</span> {selectedProductForOrder.shop?.name}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-[#FF5B26]">
                    ₹{(selectedProductForOrder.current_price || selectedProductForOrder.discount_price).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Pickup Instructions Banner */}
              <div className="p-4 bg-orange-50/80 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-800/40 rounded-2xl space-y-2 text-xs text-orange-900 dark:text-orange-200">
                <div className="flex items-center gap-2">
                  <QrCode size={18} className="text-[#FF5B26] shrink-0" />
                  <strong className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                    Instant QR Pass &amp; 6-Digit PIN
                  </strong>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600 dark:text-gray-300">
                  Reserving locks in your surplus discount immediately. You will receive a <strong>Scannable Store QR Pass &amp; 6-Digit PIN</strong> to show the merchant upon in-store collection.
                </p>
                <div className="pt-1 text-[11px] font-bold text-[#FF5B26] flex items-start gap-1">
                  <MapPin size={13} className="shrink-0 mt-0.5" />
                  <span>{selectedProductForOrder.shop?.name} &bull; {selectedProductForOrder.shop?.address}</span>
                </div>
              </div>

              {/* Order total */}
              <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-3 text-sm">
                <div>
                  <span className="font-bold text-gray-500 text-xs block">Pay at Store Counter</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Zero online fee &bull; Pay when collecting</span>
                </div>
                <span className="text-xl font-black text-[#FF5B26]">
                  ₹{(selectedProductForOrder.current_price || selectedProductForOrder.discount_price).toFixed(2)}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedProductForOrder(null)}
                  className="flex-1 py-3.5 rounded-xl border font-bold text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-center cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPlacingOrder}
                  className="flex-[2] py-3.5 rounded-xl bg-[#FF5B26] hover:bg-[#E54B18] text-white font-black text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/25 cursor-pointer disabled:opacity-50"
                >
                  {isPlacingOrder ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}
                  <span>{isPlacingOrder ? "Generating Pass..." : "Reserve & Get QR Pass"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Store Pickup QR Pass & 6-Digit PIN Modal */}
      <AnimatePresence>
        {orderSuccessDetails && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full shadow-2xl border border-orange-200/50 dark:border-gray-800 overflow-hidden p-6 text-center space-y-4"
            >
              {/* Header Status Badge */}
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-xs font-black">
                <ShieldCheck size={14} />
                <span>STORE PICKUP PASS READY</span>
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-gray-950 dark:text-white">Reservation Confirmed!</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Show this QR code or 6-digit PIN to the shopkeeper at the counter to collect your item.
                </p>
              </div>

              {/* Big High-Contrast QR Code Card */}
              <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white p-5 rounded-3xl border border-slate-800 shadow-xl space-y-4">
                <div className="bg-white p-4 rounded-2xl inline-block shadow-md mx-auto">
                  {/* High contrast dynamic QR code */}
                  <div className="w-36 h-36 bg-white flex flex-col items-center justify-center relative p-1 rounded-xl">
                    <QRCodeSVG
                      value={`EXPIRYGO:${orderSuccessDetails.pickupCode}`}
                      size={136}
                      level="H"
                      includeMargin={false}
                      fgColor="#020617"
                    />
                  </div>
                </div>

                {/* 6-Digit PIN Display */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    6-Digit Pickup PIN
                  </span>
                  <div className="font-mono text-2xl font-black tracking-[0.35em] text-orange-400 bg-slate-800/90 py-2.5 px-5 rounded-xl border border-slate-700/60 inline-block shadow-inner">
                    {orderSuccessDetails.pickupCode.split("").join(" ")}
                  </div>
                </div>

                {/* Store Details Box */}
                <div className="text-left text-xs bg-slate-800/50 p-3.5 rounded-2xl border border-slate-700/40 space-y-1.5">
                  <div className="flex justify-between items-center text-slate-200 font-bold">
                    <span className="truncate max-w-[210px]">{orderSuccessDetails.name}</span>
                    <span className="text-orange-400 font-black text-sm">₹{orderSuccessDetails.price.toFixed(2)}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <MapPin size={12} className="text-orange-400 shrink-0" />
                    <span className="truncate">{orderSuccessDetails.shopName} {orderSuccessDetails.shopAddress ? `• ${orderSuccessDetails.shopAddress}` : ""}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setOrderSuccessDetails(null)}
                  className="flex-1 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300 font-bold text-xs py-3.5 rounded-xl transition cursor-pointer"
                >
                  Done / Deals
                </button>
                <Link
                  href="/cart"
                  className="flex-1 bg-[#FF5B26] hover:bg-[#E54B18] text-white font-black text-xs py-3.5 rounded-xl transition shadow-md shadow-orange-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>My Pickups 🛍️</span>
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Recipe Basket Bar */}
      <AnimatePresence>
        {recipeBasket.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md bg-emerald-950 text-white rounded-2xl px-4 py-3.5 flex items-center justify-between shadow-2xl border border-emerald-800"
          >
            <div className="flex items-center gap-3">
              <div className="bg-emerald-800 p-2 rounded-xl text-emerald-350">
                <ChefHat size={18} />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-emerald-300 uppercase tracking-widest leading-none mb-0.5">AI Recipe Basket</p>
                <p className="text-xs font-bold leading-none">{recipeBasket.size} item{recipeBasket.size !== 1 ? 's' : ''} selected</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setRecipeBasket(new Set())}
                className="text-[10px] font-bold px-3 py-2 bg-emerald-900/60 hover:bg-emerald-900/90 rounded-xl transition cursor-pointer"
              >
                Clear
              </button>
              <button
                onClick={handleGenerateRecipe}
                className="text-[10px] font-bold px-4 py-2 bg-white text-emerald-950 hover:bg-emerald-50 rounded-xl transition shadow-md shadow-emerald-950/20 flex items-center gap-1 cursor-pointer"
              >
                <Sparkles size={11} className="text-emerald-700" /> Cook with AI
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Recipe Generator Modal */}
      <AnimatePresence>
        {showRecipeModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-gray-900 rounded-3xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl border border-gray-150 dark:border-gray-800 flex flex-col"
            >
              
              {/* Modal Header */}
              <div className="p-5 border-b border-gray-150 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900 z-10">
                <div className="flex items-center gap-2">
                  <ChefHat size={20} className="text-emerald-600 dark:text-emerald-450" />
                  <h2 className="text-base font-black text-gray-900 dark:text-white leading-none">AI Recipe Chef</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRecipeModal(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-400 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1">
                {isGeneratingRecipe ? (
                  /* Loading State */
                  <div className="py-16 text-center space-y-4 flex flex-col items-center justify-center">
                    <div className="relative">
                      <ChefHat size={48} className="text-emerald-600 animate-pulse" />
                      <Sparkles size={18} className="text-amber-500 absolute -top-1 -right-1 animate-spin" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-black text-gray-900 dark:text-white">AI Chef is cooking...</p>
                      <p className="text-xs text-gray-400">Designing a zero-waste recipe using your rescued deals</p>
                    </div>
                    <div className="w-24 bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden mt-4 relative">
                      <div className="absolute top-0 left-0 h-full bg-emerald-600 rounded-full w-12 animate-loading-bar" />
                    </div>
                  </div>
                ) : generatedRecipe ? (
                  /* Recipe Display State */
                  <div className="space-y-6 animate-in fade-in duration-300">
                    
                    {/* Title and details */}
                    <div className="text-center space-y-2">
                      <h3 className="text-xl font-black tracking-tight text-gray-950 dark:text-white leading-tight">
                        {generatedRecipe.recipe_name}
                      </h3>
                      <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                        {generatedRecipe.description}
                      </p>
                      
                      <div className="flex items-center justify-center gap-3 pt-3 flex-wrap">
                        <span className="bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-md text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                          ⏱️ Prep: {generatedRecipe.prep_time}
                        </span>
                        <span className="bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-md text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                          🍳 Cook: {generatedRecipe.cook_time}
                        </span>
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          generatedRecipe.difficulty === 'Easy' 
                            ? 'bg-emerald-50 text-emerald-700' 
                            : generatedRecipe.difficulty === 'Medium' 
                            ? 'bg-amber-50 text-amber-700' 
                            : 'bg-red-50 text-red-750'
                        }`}>
                          🔥 Level: {generatedRecipe.difficulty}
                        </span>
                      </div>
                    </div>

                    {/* Carbon/Waste saved alert */}
                    <div className="bg-emerald-500/[0.04] dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-4 flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-300 text-left">
                      <Leaf size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-black text-emerald-900 dark:text-emerald-250 uppercase tracking-wider text-[9px] mb-0.5">Rescued Waste Impact</strong>
                        {generatedRecipe.waste_saved_summary}
                      </div>
                    </div>

                    {/* Ingredients section */}
                    <div className="space-y-2.5 text-left">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Ingredients Checklist</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {generatedRecipe.ingredients.map((ing, i) => (
                          <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100/50">
                            <input type="checkbox" className="rounded text-emerald-600 focus:ring-emerald-500" />
                            <div className="min-w-0 flex-1 flex flex-col leading-none">
                              <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{ing.name}</span>
                              <span className="text-[10px] text-gray-400 mt-0.5">{ing.quantity}</span>
                            </div>
                            {ing.is_deal && (
                              <span className="bg-emerald-500/10 text-emerald-600 text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider whitespace-nowrap">
                                Rescued Deal
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Instructions section */}
                    <div className="space-y-3 text-left">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Cooking Instructions</h4>
                      <div className="space-y-3">
                        {generatedRecipe.instructions.map((step, i) => (
                          <div key={i} className="flex gap-3">
                            <div className="w-5 h-5 rounded-full bg-emerald-500 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                              {step.step_number}
                            </div>
                            <p className="text-xs text-gray-700 dark:text-gray-300 leading-normal pt-0.5 font-medium">
                              {step.instruction}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                      <button
                        type="button"
                        onClick={() => setShowRecipeModal(false)}
                        className="flex-1 py-3.5 rounded-xl border font-bold text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-850 transition cursor-pointer"
                      >
                        Close Recipe
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRecipeBasket(new Set());
                          setShowRecipeModal(false);
                        }}
                        className="flex-1 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-555 text-white font-bold text-xs shadow-md shadow-emerald-500/10 transition cursor-pointer"
                      >
                        Clear Basket & Reset
                      </button>
                    </div>

                  </div>
                ) : (
                  /* Error/Null State */
                  <p className="text-center text-sm text-red-500">Failed to load recipe details. Please try again.</p>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

        {/* Floating Go to Top Button */}
        <AnimatePresence>
          {showGoTop && !recipeBasket.size && (
            <motion.button
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 20 }}
              onClick={scrollToTop}
              className="fixed bottom-24 right-4 z-40 bg-white dark:bg-gray-800 text-emerald-600 p-3 rounded-full shadow-2xl border border-emerald-100 dark:border-gray-700 hover:bg-emerald-50 transition-all cursor-pointer"
              aria-label="Scroll to top"
            >
              <ChevronDown size={20} className="rotate-180" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </ShopperLayout>
  );
}
