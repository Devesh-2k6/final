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
  Trophy
} from "lucide-react";

import { useAuth } from "@/contexts/AuthenticationContext";
import { DealProductCard } from "@/components/products/DealProductCard";
import { DealProductSkeleton } from "@/components/products/DealProductSkeleton";
import { getErrorMessage } from "@/api/errors";
import { useProducts } from "@/hooks/useProducts";
import { buildDealProductCardProps } from "@/lib/products/map-deal-product";
import { createOrder } from "@/services/orders";
import { addFavorite, removeFavorite, getFavorites, getRecommendedProducts, getDeepSearchResults, type ApiRecipeSearchResponse } from "@/services/products";
import { getMyFollowing, followShop, unfollowShop } from "@/services/shops";
import { BottomNav } from "@/components/BottomNav";
import type { ProductCategory, ApiProduct } from "@/types/product";
import { fetchIpGeolocation } from "@/lib/geolocation";

const FILTERS = ["All", "AI Recommended ✨", "Saved ❤️", "BAKERY", "DAIRY", "PRODUCE", "MEAT", "PANTRY", "PREPARED_FOOD", "OTHER"];

export default function CustomerDealsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [orderSuccessDetails, setOrderSuccessDetails] = useState<{ name: string; shopName: string; price: number; type: "PICKUP" | "DELIVERY" } | null>(null);

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
    { refreshInterval: 5000 }
  );

  const { products: standardProducts, status: standardStatus, errorMessage: standardErrorMessage, refetch: refetchStandard } = useProducts({ 
    hideExpired: true,
    q: search || undefined,
    category: (activeFilter === "All" || activeFilter === "AI Recommended ✨") ? undefined : (activeFilter as ProductCategory),
    lat,
    lng,
    radius_km: lat ? 50 : undefined
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
    
    if (orderType === "DELIVERY") {
      if (!deliveryName.trim() || !deliveryPhone.trim() || !deliveryAddress.trim()) {
        alert("Please fill in all delivery details.");
        return;
      }
    }
    
    setIsPlacingOrder(true);
    try {
      await createOrder({
        product_id: selectedProductForOrder.id,
        order_type: orderType,
        quantity: 1,
        delivery_fee: orderType === "DELIVERY" ? 45.0 : 0.0,
        customer_name: orderType === "DELIVERY" ? deliveryName.trim() : user?.name,
        customer_phone: orderType === "DELIVERY" ? deliveryPhone.trim() : undefined,
        delivery_address: orderType === "DELIVERY" ? deliveryAddress.trim() : undefined,
      });
      setOrderSuccessDetails({
        name: selectedProductForOrder.name,
        shopName: selectedProductForOrder.shop?.name ?? "Local Shop",
        price: (selectedProductForOrder.current_price || selectedProductForOrder.discount_price) + (orderType === "DELIVERY" ? 45.0 : 0.0),
        type: orderType
      });
      setSelectedProductForOrder(null);
      void refetchStandard();
      if (isDeepSearchActive) {
        void mutateDeepSearch();
      }
    } catch (err) {
      alert("Failed to place order: " + getErrorMessage(err));
    } finally {
      setIsPlacingOrder(false);
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
    ? (isDeepSearchActive && deepSearchData && !deepSearchData.recipe_mode ? deepSearchData.products : standardProducts).filter((p) => favorites.has(p.id))
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
    <div className="min-h-screen bg-[#F4FBF7] pb-24">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-3xl border-b border-emerald-100/50 px-4 pt-4 pb-3">
        <div className="max-w-2xl mx-auto">
          {/* Top row: brand + user */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="bg-emerald-500 p-1.5 rounded-xl text-white shadow-lg shadow-emerald-500/30">
                <Leaf size={16} />
              </div>
              <div>
                <h1 className="text-base font-black text-gray-900 dark:text-white leading-none">
                  Fresh<span className="text-emerald-500">Save</span>
                </h1>
                <p className="text-[10px] text-gray-400 leading-none mt-0.5">Nearby deals</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Notifications bell */}
              <Link
                href="/notifications"
                className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                aria-label="Notifications"
              >
                <Bell size={20} className="text-gray-600 dark:text-gray-300" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-900" />
              </Link>

              {user ? (
                /* ── User avatar + dropdown ── */
                <div className="relative" ref={menuRef}>
                  <button
                    id="user-menu-trigger"
                    onClick={() => setShowUserMenu((v) => !v)}
                    className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 px-2 py-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                    aria-label="User menu"
                  >
                    <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm">
                      {initial}
                    </div>
                    <ChevronDown size={14} className="text-gray-500 dark:text-gray-400" />
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      {/* User info */}
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                        <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                          Customer
                        </span>
                      </div>

                      {/* Menu items */}
                      <Link
                        href="/profile"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                      >
                        <User size={16} className="text-gray-500" />
                        View Profile
                      </Link>
                      <Link
                        href="/notifications"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                      >
                        <Bell size={16} className="text-gray-500" />
                        Notifications
                      </Link>

                      <div className="border-t border-gray-100 dark:border-gray-700" />

                      {/* Logout */}
                      <button
                        id="logout-btn"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                      >
                        <LogOut size={16} />
                        Log out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* ── Sign-in link ── */
                <Link
                  href="/auth?role=customer&tab=login"
                  className="flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-400 px-3 py-2 rounded-full transition"
                >
                  <LogIn size={14} />
                  Sign in
                </Link>
              )}
            </div>
          </div>

          {/* Search bar + Filter button row */}
          <div className="bg-[#E2F0E7] p-1.5 rounded-full flex gap-1 items-center border border-emerald-100 shadow-[0_4px_20px_rgba(16,185,129,0.06)]">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-800/80" />
              <input
                id="deals-search"
                type="search"
                placeholder="Search near-expiry deals…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white text-sm text-slate-800 placeholder:text-slate-400 border border-emerald-100/50 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all font-semibold"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 text-xs font-extrabold px-5 py-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                showFilters || isDeepSearchActive
                  ? "bg-[#15803D] text-white shadow-md shadow-emerald-500/20"
                  : "bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-100"
              }`}
            >
              <SlidersHorizontal size={14} />
              <span>Filter</span>
            </button>
          </div>

          {/* Category filter pills */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => {
                  setActiveFilter(f);
                  if (f === "AI Recommended ✨" || f === "Saved ❤️") {
                    // Close advanced filters if using static special filters
                    setShowFilters(false);
                  }
                }}
                className={`flex-shrink-0 text-xs font-bold px-4 py-1.5 rounded-full transition-all duration-150 ${
                  activeFilter === f
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {f}
              </button>
            ))}
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                    {/* Expiry Urgency Select */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                        Expiry Urgency
                      </label>
                      <select
                        value={expiryUrgency}
                        onChange={(e) => setExpiryUrgency(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-2.5 py-1.5 outline-none text-gray-900 dark:text-white"
                      >
                        <option value="any">Any Expiry</option>
                        <option value="today">Expiring Today (&lt;24h)</option>
                        <option value="tomorrow">Expiring Tomorrow (&lt;48h)</option>
                        <option value="week">Expiring This Week</option>
                      </select>
                    </div>

                    {/* AI Semantic Search Toggle */}
                    <div className="flex items-center justify-between gap-3 pt-2 sm:pt-0">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                          AI Semantic Parsing
                        </label>
                        <span className="text-[9px] text-gray-400 leading-none">Understand query intent</span>
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
                    <div className="flex items-center justify-between gap-3 pt-2 sm:pt-0">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                          Recipe Ingredient Match
                        </label>
                        <span className="text-[9px] text-gray-400 leading-none">Assemble recipe bundles</span>
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
      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-3">
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
            className="flex flex-col items-center justify-center bg-white dark:bg-gray-800 border border-emerald-500/30 px-3 py-3 rounded-2xl shadow-sm hover:bg-emerald-50 dark:hover:bg-gray-700 transition flex-shrink-0"
          >
            <MapPin size={18} className="text-emerald-500 mb-0.5" />
            <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">Nearby</span>
          </button>
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────────────── */}
      <main className="p-4 max-w-2xl mx-auto">
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
            {[1, 2, 3, 4].map((i) => (
              <DealProductSkeleton key={i} />
            ))}
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
                <p className="font-bold text-gray-900 dark:text-white text-base">No saved deals yet.</p>
                <p className="text-sm mt-1 max-w-sm mx-auto text-gray-500 dark:text-gray-400 leading-relaxed">
                  Tap the ❤️ icon on any deal to save it here for quick access later.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveFilter("All")}
                  className="mt-5 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-md shadow-emerald-500/10 cursor-pointer"
                >
                  Explore Active Deals
                </button>
              </>
            ) : (
              <>
                <Package size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="font-semibold text-gray-900 dark:text-white">No active deals yet.</p>
                <p className="text-sm mt-1">Shops can add deals from the shopkeeper dashboard.</p>
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
            {displayProducts.map((product, index) => (
              <DealProductCard
                key={product.id}
                {...buildDealProductCardProps(product, index, playingId, handleTogglePlay, handleReserve, lat, lng)}
                isFavorite={favorites.has(product.id)}
                isFollowing={following.has(product.shop_id)}
                onToggleFavorite={handleToggleFavorite}
                onToggleFollow={handleToggleFollow}
              />
            ))}
          </div>
        )}
      </main>

      {/* Order Options Modal */}
      {selectedProductForOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900 dark:text-white">
                {paymentStep === "upi" ? "Scan to Pay" : "Order Options"}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedProductForOrder(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-400"
              >
                <X size={18} />
              </button>
            </div>

            {paymentStep === "upi" ? (
              <div className="p-6 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 inline-block mx-auto">
                  <QrCode size={180} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Pay ₹{((selectedProductForOrder.current_price || selectedProductForOrder.discount_price) + (orderType === "DELIVERY" ? 45.0 : 0.0)).toFixed(2)} to {selectedProductForOrder.shop?.name}</p>
                  <p className="text-xs text-gray-500">Scan this QR code using any UPI app (GPay, PhonePe, Paytm)</p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentStep("options")}
                    className="flex-1 py-3 rounded-xl border font-bold text-xs text-gray-600 dark:text-gray-400"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleConfirmOrder}
                    disabled={isPlacingOrder}
                    className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                  >
                    {isPlacingOrder ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                    I have paid
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => {
                e.preventDefault();
                setPaymentStep("upi");
              }} className="p-6 space-y-6">
                {/* Product preview */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedProductForOrder.front_image_url}
                    className="w-12 h-12 rounded-xl object-cover border"
                    alt=""
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-gray-900 dark:text-white text-xs truncate">
                      {selectedProductForOrder.name}
                    </h4>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {selectedProductForOrder.shop?.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                      ₹{(selectedProductForOrder.current_price || selectedProductForOrder.discount_price).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Delivery / Pickup options */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setOrderType("PICKUP")}
                    className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-1.5 transition-all ${
                      orderType === "PICKUP"
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        : "border-gray-100 dark:border-gray-800 text-gray-500 hover:border-gray-200 dark:hover:border-gray-700"
                    }`}
                  >
                    <ShoppingBag size={18} />
                    <span className="text-xs font-bold">Store Pickup</span>
                    <span className="text-[10px] opacity-75">Free</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType("DELIVERY")}
                    className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-1.5 transition-all ${
                      orderType === "DELIVERY"
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        : "border-gray-100 dark:border-gray-800 text-gray-500 hover:border-gray-200 dark:hover:border-gray-700"
                    }`}
                  >
                    <Truck size={18} />
                    <span className="text-xs font-bold">Home Delivery</span>
                    <span className="text-[10px] opacity-75">+ ₹45.00</span>
                  </button>
                </div>

                {/* Delivery fields */}
                {orderType === "DELIVERY" ? (
                  <div className="space-y-3.5 animate-in slide-in-from-top-3 duration-250">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Customer Name
                      </label>
                      <input
                        type="text"
                        required
                        value={deliveryName}
                        onChange={(e) => setDeliveryName(e.target.value)}
                        placeholder="Jane Doe"
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 outline-none text-xs text-gray-900 dark:text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Phone Number
                      </label>
                      <div className="relative">
                        <input
                          type="tel"
                          required
                          value={deliveryPhone}
                          onChange={(e) => setDeliveryPhone(e.target.value)}
                          placeholder="e.g. 9876543210"
                          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-3 py-2 outline-none text-xs text-gray-900 dark:text-white placeholder:text-gray-505 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                          <Phone size={12} />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Delivery Address
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="Street, building, apartment number..."
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 outline-none text-xs text-gray-900 dark:text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-2xl flex items-start gap-2.5 text-xs text-blue-800 dark:text-blue-300">
                    <MapPin size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      Pickup coordinates are locked. Please collect your items at: <br />
                      <strong className="block mt-1 text-blue-900 dark:text-blue-200">
                        {selectedProductForOrder.shop?.name} - {selectedProductForOrder.shop?.address}
                      </strong>
                    </div>
                  </div>
                )}

                {/* Order total */}
                <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-4 text-sm">
                  <span className="font-bold text-gray-500">Total Price</span>
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                    ₹
                    {(
                      (selectedProductForOrder.current_price || selectedProductForOrder.discount_price) +
                      (orderType === "DELIVERY" ? 45.0 : 0.0)
                    ).toFixed(2)}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedProductForOrder(null)}
                    className="flex-1 py-3 rounded-xl border font-bold text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
                  >
                    <CreditCard size={14} />
                    Pay via UPI
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Premium Order Success Modal */}
      <AnimatePresence>
        {orderSuccessDetails && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full shadow-2xl border border-emerald-100/50 dark:border-gray-800 overflow-hidden p-6 text-center space-y-4"
            >
              {/* Animated checkmark circle */}
              <div className="flex justify-center mt-2">
                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
                  <svg className="w-10 h-10 text-emerald-600 dark:text-emerald-450" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5">
                    <motion.path
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                      className="animate-draw-checkmark"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-black text-gray-950 dark:text-white">Order Confirmed!</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {orderSuccessDetails.type === "DELIVERY" 
                    ? "Delivery request placed! The store will review it shortly."
                    : "Reservation confirmed! Collect your items at the store."}
                </p>
              </div>

              {/* Order specifications card */}
              <div className="p-4 bg-emerald-500/[0.02] border border-emerald-100/40 dark:border-gray-800 rounded-2xl text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Item Reserved</span>
                  <span className="font-bold text-gray-900 dark:text-white text-right max-w-[200px] truncate">{orderSuccessDetails.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Store Location</span>
                  <span className="font-bold text-gray-900 dark:text-white text-right max-w-[200px] truncate">{orderSuccessDetails.shopName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Fulfillment</span>
                  <span className="font-bold text-gray-900 dark:text-white">{orderSuccessDetails.type === "DELIVERY" ? "🚚 Home Delivery" : "🛍️ Store Pickup"}</span>
                </div>
                <div className="border-t border-emerald-100/20 dark:border-gray-800 my-1 pt-2 flex justify-between items-center text-sm font-black">
                  <span className="text-slate-700 dark:text-gray-300">
                    {orderSuccessDetails.type === "DELIVERY" ? "Total Paid" : "Pay at Store"}
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400">₹{orderSuccessDetails.price.toFixed(2)}</span>
                </div>

              </div>

              <button
                type="button"
                onClick={() => setOrderSuccessDetails(null)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3.5 rounded-xl transition shadow-md shadow-emerald-500/10 cursor-pointer"
              >
                Back to Feed
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
