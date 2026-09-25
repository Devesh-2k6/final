"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogIn,
  MapPin,
  Navigation,
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
  Sparkles,
  Copy,
  Check,
  CheckCircle,
  ExternalLink,
  AlertCircle,
  Plus,
  Minus,
  Building,
  Home,
  Lock,
  Smartphone,
  Layers,
  Apple,
  Milk,
  Wheat,
  Beef,
  Utensils,
  Croissant,
  Bookmark,
  Store,
  ArrowRight,
  ArrowUpRight,
  Flame,
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
import { createOrder, reportOrderPayment } from "@/services/orders";
import { createReservation } from "@/services/reservations";
import { addFavorite, removeFavorite, getFavorites, getRecommendedProducts, getDeepSearchResults, generateRecipe, type ApiRecipeSearchResponse, type ApiRecipeResponse } from "@/services/products";
import { getMyFollowing, followShop, unfollowShop } from "@/services/shops";
import { ShopperLayout } from "@/components/layout/ShopperLayout";
import { LiveDealTicker } from "@/components/ui/LiveDealTicker";
import type { ProductCategory, ApiProduct, ApiOrder } from "@/types/product";
import { fetchIpGeolocation } from "@/lib/geolocation";
import { useToast } from "@/components/ui/Toast";

const FILTERS = ["All", "AI Recommended ✨", "Saved ❤️", "BAKERY", "DAIRY", "PRODUCE", "MEAT", "PANTRY", "PREPARED_FOOD", "OTHER"];

export default function CustomerDealsPage() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const toast = useToast();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showGoTop, setShowGoTop] = useState(false);
  const [orderSuccessDetails, setOrderSuccessDetails] = useState<{
    id: string;
    name: string;
    shopName: string;
    shopAddress?: string;
    price: number;
    deliveryFee?: number;
    pickupCode?: string;
    deliveryPin?: string;
    deliveryAddress?: string;
    type: "PICKUP" | "DELIVERY";
    status?: string;
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
  const [locationSource, setLocationSource] = useState<"gps" | "ip" | "none">("none");
  const [locationCity, setLocationCity] = useState<string | null>(null);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [ignoreDistance, setIgnoreDistance] = useState(false);
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

  // Swiggy/Zepto Style Order & Delivery Modal States
  const [selectedProductForOrder, setSelectedProductForOrder] = useState<ApiProduct | null>(null);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [orderType, setOrderType] = useState<"PICKUP" | "DELIVERY">("DELIVERY");
  const [deliveryName, setDeliveryName] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [modalStep, setModalStep] = useState<"details" | "upi_payment">("details");
  const [createdDeliveryOrder, setCreatedDeliveryOrder] = useState<ApiOrder | null>(null);
  const [upiTransactionId, setUpiTransactionId] = useState("");
  const [isReportingPayment, setIsReportingPayment] = useState(false);
  const [upiError, setUpiError] = useState("");
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isLocatingAddress, setIsLocatingAddress] = useState(false);

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
    lat: ignoreDistance ? undefined : lat,
    lng: ignoreDistance ? undefined : lng,
    radiusKm: ignoreDistance ? undefined : radiusKm
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
    lat: ignoreDistance ? undefined : lat,
    lng: ignoreDistance ? undefined : lng,
    radius_km: ignoreDistance ? undefined : (lat ? 50 : undefined)
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

  // GPS-First Geolocation with IP Geolocation Fallback
  const detectLocation = useCallback((isManualClick = false) => {
    setIsLocating(true);
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
          setLocationSource("gps");
          setLocationPermissionDenied(false);
          setIsLocating(false);
        },
        (err) => {
          console.warn("GPS lookup was denied or timed out:", err);
          setLocationPermissionDenied(true);
          // Fall back to coarse IP geolocation
          fetchIpGeolocation()
            .then((data) => {
              setLat(data.latitude);
              setLng(data.longitude);
              setLocationCity(data.city || data.region || null);
              setLocationSource("ip");
            })
            .catch((ipErr) => {
              console.error("IP geolocation fallback failed:", ipErr);
              setLocationSource("none");
            })
            .finally(() => {
              setIsLocating(false);
            });
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
      );
    } else {
      fetchIpGeolocation()
        .then((data) => {
          setLat(data.latitude);
          setLng(data.longitude);
          setLocationCity(data.city || data.region || null);
          setLocationSource("ip");
        })
        .catch(() => setLocationSource("none"))
        .finally(() => setIsLocating(false));
    }
  }, []);

  useEffect(() => {
    detectLocation(false);
  }, [detectLocation]);

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
      toast.error("Favorite action failed", getErrorMessage(err));
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
      toast.error("Follow action failed", getErrorMessage(err));
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
      setOrderQuantity(1);
      // Default to Delivery only if shop supports delivery AND has a valid UPI ID configured
      const canDeliver = Boolean(found.shop?.delivery_enabled && found.shop?.upi_id?.trim());
      setOrderType(canDeliver ? "DELIVERY" : "PICKUP");
      setModalStep("details");
      setDeliveryName(user.name || "");
      setDeliveryPhone(user.phone_number || "");
      setDeliveryAddress("");
      setDeliveryNotes("");
      setCreatedDeliveryOrder(null);
      setUpiTransactionId("");
      setUpiError("");
      setCopiedUpi(false);
    }
  };

  const handleDetectAddress = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocatingAddress(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          if (data && data.display_name) {
            setDeliveryAddress(data.display_name);
          } else {
            setDeliveryAddress(`GPS Location: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          }
        } catch {
          setDeliveryAddress(`Coordinates: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
        } finally {
          setIsLocatingAddress(false);
        }
      },
      (err) => {
        console.warn("GPS error:", err);
        setIsLocatingAddress(false);
        toast.error("Could not retrieve GPS location. Please type your delivery address.");
      },
      { timeout: 8000 }
    );
  };

  const handlePlaceOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForOrder) return;

    if (orderType === "DELIVERY") {
      if (!deliveryName.trim()) {
        toast.warning("Delivery Name Required", "Please enter the recipient's name for delivery.");
        return;
      }
      if (!deliveryPhone.trim() || deliveryPhone.trim().length < 10) {
        toast.warning("Invalid Mobile Number", "Please enter a valid 10-digit mobile number for delivery contact.");
        return;
      }
      if (!deliveryAddress.trim()) {
        toast.warning("Delivery Address Required", "Please enter a complete delivery address.");
        return;
      }

      setIsPlacingOrder(true);
      try {
        const deliveryFeeVal = selectedProductForOrder.shop?.delivery_fee ?? 35;
        const order = await createOrder({
          product_id: selectedProductForOrder.id,
          quantity: orderQuantity,
          order_type: "DELIVERY",
          delivery_fee: deliveryFeeVal,
          customer_name: deliveryName.trim(),
          customer_phone: deliveryPhone.trim(),
          delivery_address: deliveryAddress.trim(),
          delivery_notes: deliveryNotes.trim() || undefined,
        });

        setCreatedDeliveryOrder(order);
        setModalStep("upi_payment");
        setUpiTransactionId("");
        setUpiError("");
        void refetchStandard();
        if (isDeepSearchActive) {
          void mutateDeepSearch();
        }
      } catch (err) {
        toast.error("Order Creation Failed", getErrorMessage(err));
      } finally {
        setIsPlacingOrder(false);
      }
    } else {
      // In-Store Pickup Reservation
      setIsPlacingOrder(true);
      try {
        const price = selectedProductForOrder.current_price || selectedProductForOrder.discount_price || 0;
        const res = await createReservation(selectedProductForOrder.id, orderQuantity);

        setOrderSuccessDetails({
          id: res.id,
          name: selectedProductForOrder.name,
          shopName: res.product?.shop?.name ?? selectedProductForOrder.shop?.name ?? "Local Shop",
          shopAddress: res.product?.shop?.address ?? selectedProductForOrder.shop?.address ?? "Store Counter",
          price: res.total_price || (price * orderQuantity),
          pickupCode: res.pickup_code,
          type: "PICKUP",
          status: "CONFIRMED",
        });
        setSelectedProductForOrder(null);
        void refetchStandard();
        if (isDeepSearchActive) {
          void mutateDeepSearch();
        }
      } catch (err) {
        toast.error("Reservation Failed", getErrorMessage(err));
      } finally {
        setIsPlacingOrder(false);
      }
    }
  };

  const handleConfirmUpiPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdDeliveryOrder) return;
    const utr = upiTransactionId.trim();
    if (!utr || utr.length < 6) {
      setUpiError("Please enter a valid 12-digit UPI reference / UTR number from your payment app.");
      return;
    }

    setIsReportingPayment(true);
    setUpiError("");
    try {
      const updatedOrder = await reportOrderPayment(createdDeliveryOrder.id, utr);
      setOrderSuccessDetails({
        id: updatedOrder.id,
        name: selectedProductForOrder?.name || updatedOrder.product?.name || "Deal Item",
        shopName: selectedProductForOrder?.shop?.name || updatedOrder.product?.shop?.name || "Partner Store",
        shopAddress: selectedProductForOrder?.shop?.address || updatedOrder.product?.shop?.address,
        price: updatedOrder.total_price,
        deliveryFee: updatedOrder.delivery_fee,
        deliveryPin: updatedOrder.delivery_pin || undefined,
        deliveryAddress: updatedOrder.delivery_address || undefined,
        type: "DELIVERY",
        status: "PAID_VERIFYING",
      });
      setSelectedProductForOrder(null);
      setCreatedDeliveryOrder(null);
      setModalStep("details");
      void refetchStandard();
      if (isDeepSearchActive) {
        void mutateDeepSearch();
      }
    } catch (err) {
      setUpiError("Failed to submit payment UTR: " + getErrorMessage(err));
    } finally {
      setIsReportingPayment(false);
    }
  };

  const handleCopyUpi = (upiId: string) => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
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
      toast.error("Recipe Generation Failed", getErrorMessage(err));
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
      toast.error("Recipe Generation Failed", getErrorMessage(err));
      setShowRecipeModal(false);
    } finally {
      setIsGeneratingRecipe(false);
    }
  };

  const handleUseLocation = () => {
    detectLocation(true);
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
      <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0B0F17] pb-24 transition-colors">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#0F141F]/80 backdrop-blur-xl border-b border-zinc-200/70 dark:border-zinc-800/80 px-4 lg:px-8 py-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="w-full max-w-2xl lg:max-w-7xl mx-auto space-y-3">
            {/* Top Row: Location Selector & Quick Action Pills */}
            <div className="flex items-center justify-between gap-3">
              {/* Left: Location Selector Pill */}
              <button
                type="button"
                onClick={handleUseLocation}
                disabled={isLocating}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200/70 dark:bg-zinc-800/70 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition border border-zinc-200/60 dark:border-zinc-700/60 cursor-pointer"
              >
                <MapPin size={13} className="text-emerald-500 shrink-0" />
                <span className="truncate max-w-[130px] sm:max-w-xs font-bold text-zinc-900 dark:text-white">
                  {locationCity || (lat && lng ? "Live GPS Location" : "Chennai, Anna Nagar")}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <ChevronDown size={12} className="text-zinc-400 shrink-0" />
              </button>

              {/* Right: Quick Actions */}
              <div className="flex items-center gap-2">
                <Link
                  href="/reservations"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200/70 dark:bg-zinc-800/70 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition border border-zinc-200/60 dark:border-zinc-700/60"
                  title="Counter QR Pickup Pass"
                >
                  <QrCode size={13} className="text-zinc-500" />
                  <span className="hidden sm:inline">Pickups</span>
                </Link>

                <Link
                  href="/notifications"
                  className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200/70 dark:bg-zinc-800/70 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 transition relative border border-zinc-200/60 dark:border-zinc-700/60"
                  title="Notifications"
                >
                  <Bell size={14} />
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-zinc-900" />
                </Link>

                {user && (
                  <Link
                    href="/profile"
                    className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex items-center justify-center font-bold text-xs"
                    title={user.name || "Profile"}
                  >
                    {user.name ? user.name[0].toUpperCase() : "U"}
                  </Link>
                )}
              </div>
            </div>

            {/* Search Bar + Filters + AI Recipe Studio */}
            <div className="flex items-center gap-2.5">
              <div className="relative flex-1 bg-zinc-50 dark:bg-zinc-900/90 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center px-3.5 py-2.5 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/10 transition shadow-2xs">
                <Search size={15} className="text-zinc-400 mr-2.5 shrink-0" />
                <input
                  id="deals-search"
                  type="search"
                  placeholder="Search surplus food, groceries, nearby bakeries, shops..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none font-medium"
                />
                
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={() => setShowFilters(!showFilters)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      showFilters || isDeepSearchActive
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-800"
                    }`}
                    title="Filters & Budget"
                  >
                    <SlidersHorizontal size={13} />
                    <span className="hidden md:inline text-[11px]">Filters</span>
                    {isDeepSearchActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />}
                  </button>

                  <Link
                    href="/map"
                    className="p-1.5 text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-800 rounded-lg transition"
                    title="Map View"
                  >
                    <MapPin size={15} />
                  </Link>
                </div>
              </div>

              {/* AI Recipe Assistant Pill */}
              <Link
                href="/pantry"
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-xs font-semibold shadow-2xs shrink-0 transition"
                title="AI Recipe Studio"
              >
                <Sparkles size={13} className="text-emerald-400 dark:text-emerald-600" />
                <span>Recipe Studio</span>
              </Link>
            </div>

            {/* Segmented Category Filter Chips */}
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-hide pt-1">
              {[
                { id: "All", label: "All Deals", icon: Layers, color: "text-emerald-500" },
                { id: "AI Recommended ✨", label: "AI Picks", icon: Sparkles, color: "text-purple-500" },
                { id: "BAKERY", label: "Bakery", icon: Croissant, color: "text-amber-500" },
                { id: "DAIRY", label: "Dairy", icon: Milk, color: "text-blue-500" },
                { id: "PRODUCE", label: "Produce", icon: Apple, color: "text-emerald-500" },
                { id: "MEAT", label: "Meat & Poultry", icon: Beef, color: "text-rose-500" },
                { id: "PANTRY", label: "Pantry Staples", icon: Wheat, color: "text-amber-600" },
                { id: "PREPARED_FOOD", label: "Ready Food", icon: Utensils, color: "text-orange-500" },
                { id: "Saved ❤️", label: "Saved", icon: Bookmark, color: "text-rose-500" },
              ].map((cat) => {
                const active = activeFilter === cat.id;
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveFilter(cat.id)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer shrink-0 ${
                      active
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                        : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                    }`}
                  >
                    <Icon size={13} className={active ? "text-emerald-400 dark:text-emerald-600" : cat.color} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
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

        {/* Location Required / Coarse IP Geolocation Hint */}
        {locationSource === "ip" && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/30 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <MapPin size={16} />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  Approximate Location ({locationCity || "Network IP"})
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  Using network IP location. Distances and local deals may be less precise.
                </p>
              </div>
            </div>
            <button
              onClick={handleUseLocation}
              disabled={isLocating}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] shrink-0 transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1"
            >
              {isLocating ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />}
              <span>{isLocating ? "Locating..." : "Enable GPS"}</span>
            </button>
          </motion.div>
        )}

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
              className="text-xs font-black text-amber-900 bg-amber-200 px-3 py-1.5 rounded-lg cursor-pointer"
            >
              Enable
            </button>
          </motion.div>
        )}
      </div>

      {/* ── Main content ────────────────────────────────────────────── */}
      <main className="p-4 lg:p-8 w-full max-w-2xl lg:max-w-7xl mx-auto space-y-6">
        {/* Dynamic Featured Surplus Hero Card (Only displayed when real deals exist) */}
        {displayProducts.length > 0 && (
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-zinc-950 via-slate-900 to-emerald-950/80 text-white shadow-xl shadow-zinc-950/10 p-6 sm:p-7 border border-zinc-800/80">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.15),transparent_50%)] pointer-events-none" />
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Featured Surplus Rescue
                </div>
                
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight capitalize">
                  {displayProducts[0].name}
                </h2>
                
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal">
                  Rescuing from <span className="font-semibold text-white">{displayProducts[0].shop?.name || "Verified Store"}</span>. Save up to {Math.max(5, Math.min(95, Math.round((1 - (displayProducts[0].current_price || displayProducts[0].discount_price) / (displayProducts[0].original_price || 1)) * 100)))}% off retail pricing before clearance expiry.
                </p>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleReserve(displayProducts[0].id)}
                    className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold px-5 py-2.5 rounded-xl text-xs transition shadow-lg shadow-emerald-500/20 cursor-pointer"
                  >
                    <span>Claim Surplus Deal</span>
                    <ArrowRight size={14} />
                  </button>

                  <span className="text-xs text-zinc-400 font-medium">
                    {displayProducts[0].quantity} units remaining
                  </span>
                </div>
              </div>

              {/* Right Hero Thumbnail */}
              <div className="relative w-full md:w-56 h-36 rounded-xl overflow-hidden bg-zinc-900 border border-white/10 shrink-0">
                <img
                  src={displayProducts[0].front_image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400"}
                  alt={displayProducts[0].name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-zinc-950/80 backdrop-blur-md text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                  Save {Math.max(5, Math.min(95, Math.round((1 - (displayProducts[0].current_price || displayProducts[0].discount_price) / (displayProducts[0].original_price || 1)) * 100)))}%
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Popular Surplus Deals Section Title */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">
              Curated Surplus Deals
            </h3>
            <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
              Near You
            </span>
          </div>
          <button
            onClick={() => setActiveFilter("All")}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            View All ({displayProducts.length})
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
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
          <div className="py-16 text-center text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-gray-900/50 border border-emerald-100/30 dark:border-gray-800 rounded-3xl p-8 backdrop-blur-md shadow-sm max-w-xl mx-auto">
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
            ) : isDeepSearchActive ? (
              <>
                <Package size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="font-bold text-gray-900 dark:text-white text-base">
                  No matching deals found
                </p>
                <p className="text-sm mt-1 max-w-sm mx-auto text-gray-500 dark:text-gray-400 leading-relaxed">
                  Try adjusting your filters or broadening your search radius.
                </p>
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
                  className="mt-4 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer"
                >
                  Reset Filters
                </button>
              </>
            ) : lat && !ignoreDistance ? (
              <>
                <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <MapPin size={28} />
                </div>
                <p className="font-bold text-gray-900 dark:text-white text-base">
                  No deals found within 50km
                </p>
                <p className="text-sm mt-1 max-w-md mx-auto text-gray-500 dark:text-gray-400 leading-relaxed">
                  There are currently no active discounted products listed in your immediate 50km area.
                </p>
                <div className="flex flex-wrap justify-center gap-3 mt-5">
                  <button
                    type="button"
                    onClick={() => setIgnoreDistance(true)}
                    className="inline-flex items-center gap-2 bg-[#FF5B26] hover:bg-[#E54B18] text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-md shadow-orange-500/20 cursor-pointer"
                  >
                    <span>🌐 Search All Deals (Ignore Distance)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void refetchStandard()}
                    className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold text-xs bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 px-4 py-2.5 rounded-xl transition cursor-pointer"
                  >
                    <RefreshCw size={13} />
                    <span>Refresh</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <Package size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="font-bold text-gray-900 dark:text-white text-base">
                  No active deals found
                </p>
                <p className="text-sm mt-1 max-w-sm mx-auto text-gray-500 dark:text-gray-400 leading-relaxed">
                  All past deals have been rescued or expired. Verified shops can add new deals from their merchant dashboard.
                </p>
                <div className="flex flex-wrap justify-center gap-3 mt-5">
                  {ignoreDistance && lat && (
                    <button
                      type="button"
                      onClick={() => setIgnoreDistance(false)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2 rounded-xl transition cursor-pointer"
                    >
                      <MapPin size={13} />
                      Filter 50km Nearby Only
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void refetchStandard()}
                    className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2 rounded-xl hover:bg-emerald-100 transition cursor-pointer"
                  >
                    <RefreshCw size={13} />
                    Refresh Feed
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {showList && (
          <div className="space-y-4 mt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {displayProducts.length} deal{displayProducts.length !== 1 ? "s" : ""} available
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
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

      {/* Swiggy / Zepto Style Deal Checkout & Delivery Modal */}
      {selectedProductForOrder && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-lg w-full shadow-2xl border border-gray-150 dark:border-gray-800 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-850/50">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${modalStep === "upi_payment" ? "bg-purple-500/10 text-purple-600 dark:text-purple-400" : orderType === "DELIVERY" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-orange-500/10 text-[#FF5B26]"}`}>
                  {modalStep === "upi_payment" ? <Smartphone size={20} /> : orderType === "DELIVERY" ? <Truck size={20} /> : <ShoppingBag size={20} />}
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-900 dark:text-white leading-tight">
                    {modalStep === "upi_payment" ? "UPI Direct Payment" : "Claim Surplus Deal"}
                  </h2>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {modalStep === "upi_payment" ? "Scan QR or enter UPI Ref to confirm order" : `Rescuing food from ${selectedProductForOrder.shop?.name || "Local Shop"}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedProductForOrder(null);
                  setCreatedDeliveryOrder(null);
                  setModalStep("details");
                }}
                className="p-2 rounded-xl hover:bg-gray-200/60 dark:hover:bg-gray-800 transition text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* STEP 1: Fulfillment Selection & Delivery Details */}
            {modalStep === "details" && (
              <form onSubmit={handlePlaceOrderSubmit} className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                
                {/* Product Preview Card */}
                <div className="flex items-center gap-3.5 p-3.5 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-150 dark:border-gray-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedProductForOrder.front_image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400"}
                    className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-gray-700 shrink-0 bg-white"
                    alt={selectedProductForOrder.name}
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-gray-950 dark:text-white text-sm truncate">
                      {selectedProductForOrder.name}
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                      <Building size={12} className="shrink-0 text-emerald-600" />
                      <span className="truncate">{selectedProductForOrder.shop?.name || "Verified Merchant"}</span>
                    </p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                        ₹{(selectedProductForOrder.current_price || selectedProductForOrder.discount_price || 0).toFixed(2)}
                      </span>
                      {selectedProductForOrder.original_price > (selectedProductForOrder.current_price || selectedProductForOrder.discount_price || 0) && (
                        <span className="text-xs text-gray-400 line-through">
                          ₹{selectedProductForOrder.original_price.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Quantity</span>
                    <div className="flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-1 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setOrderQuantity(Math.max(1, orderQuantity - 1))}
                        className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-200 transition font-bold text-xs"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-5 text-center text-xs font-black text-gray-900 dark:text-white font-mono">
                        {orderQuantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setOrderQuantity(Math.min(selectedProductForOrder.quantity || 10, orderQuantity + 1))}
                        className="w-6 h-6 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition font-bold text-xs shadow-sm shadow-emerald-500/30"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Fulfillment Mode Switcher (Swiggy / Zepto Style) */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Choose Fulfillment Method
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Option 1: Doorstep Delivery */}
                    {(() => {
                      const canDeliver = Boolean(selectedProductForOrder.shop?.delivery_enabled && selectedProductForOrder.shop?.upi_id?.trim());
                      return (
                        <button
                          type="button"
                          onClick={() => canDeliver && setOrderType("DELIVERY")}
                          disabled={!canDeliver}
                          className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between relative ${
                            !canDeliver
                              ? "opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-800"
                              : orderType === "DELIVERY"
                              ? "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm cursor-pointer"
                              : "bg-white dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 hover:border-emerald-300 opacity-75 hover:opacity-100 cursor-pointer"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${!canDeliver ? "bg-gray-200 dark:bg-gray-700 text-gray-400" : orderType === "DELIVERY" ? "bg-emerald-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500"}`}>
                              <Truck size={15} />
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${!canDeliver ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" : orderType === "DELIVERY" ? "bg-emerald-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500"}`}>
                              {!canDeliver ? "Pickup Only" : "30–45 Mins"}
                            </span>
                          </div>
                          <div>
                            <div className="text-xs font-black text-gray-900 dark:text-white">
                              Doorstep Delivery
                            </div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                              {!canDeliver ? "UPI not configured by store" : `Delivery fee: ₹${selectedProductForOrder.shop?.delivery_fee ?? 35}`}
                            </div>
                          </div>
                        </button>
                      );
                    })()}

                    {/* Option 2: Store Pickup */}
                    <button
                      type="button"
                      onClick={() => setOrderType("PICKUP")}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between relative cursor-pointer ${
                        orderType === "PICKUP"
                          ? "bg-orange-50/80 dark:bg-orange-950/30 border-[#FF5B26] ring-2 ring-orange-500/20 shadow-sm"
                          : "bg-white dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 hover:border-orange-300 opacity-75 hover:opacity-100"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${orderType === "PICKUP" ? "bg-[#FF5B26] text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500"}`}>
                          <ShoppingBag size={15} />
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${orderType === "PICKUP" ? "bg-[#FF5B26] text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500"}`}>
                          ₹0 Free
                        </span>
                      </div>
                      <div>
                        <div className="text-xs font-black text-gray-900 dark:text-white">
                          Store Self-Pickup
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                          Instant Counter QR Pass
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Conditional View: Doorstep Delivery Form */}
                {orderType === "DELIVERY" ? (
                  <div className="space-y-4 pt-1 animate-in fade-in duration-200">
                    
                    {/* Address Section */}
                    <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-1.5">
                          <MapPin size={14} className="text-emerald-500" /> Delivery Address & Contact
                        </span>
                        <button
                          type="button"
                          onClick={handleDetectAddress}
                          disabled={isLocatingAddress}
                          className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          {isLocatingAddress ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />}
                          <span>Auto-Detect GPS</span>
                        </button>
                      </div>

                      {/* Recipient Name & Phone */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Recipient Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={deliveryName}
                            onChange={(e) => setDeliveryName(e.target.value)}
                            placeholder="Full Name"
                            className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Mobile Number (+91) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="tel"
                            required
                            value={deliveryPhone}
                            onChange={(e) => setDeliveryPhone(e.target.value)}
                            placeholder="10-digit mobile"
                            maxLength={10}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                          />
                        </div>
                      </div>

                      {/* Complete Address */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Full Delivery Address (Flat / Street / Landmark / Pincode) <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          required
                          rows={2}
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          placeholder="e.g., Flat 402, Green Heights, 50th Street, Anna Nagar, Chennai - 600040"
                          className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none font-medium leading-relaxed"
                        />
                      </div>

                      {/* Delivery Instructions Quick Pills */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                          Delivery Note (Optional)
                        </label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {["Leave at door", "Ring doorbell", "Call before arrival", "Avoid calling"].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setDeliveryNotes(preset)}
                              className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition ${
                                deliveryNotes === preset
                                  ? "bg-emerald-500 text-white border-emerald-500 font-bold"
                                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-emerald-300"
                              }`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Payment Mode Notice: ONLY UPI */}
                    <div className="p-3.5 bg-gradient-to-r from-purple-900/10 via-slate-900/10 to-emerald-900/10 dark:from-purple-950/40 dark:to-emerald-950/30 border border-purple-200 dark:border-purple-800/40 rounded-2xl flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-600/20">
                        <Smartphone size={16} />
                      </div>
                      <div className="space-y-0.5 text-xs">
                        <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                          <span>Payment Method: UPI Direct Settlement</span>
                          <span className="text-[9px] font-black uppercase bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 px-2 py-0.2 rounded-full">Only UPI</span>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                          Pay directly to the merchant via <strong>Google Pay, PhonePe, Paytm, or BHIM UPI</strong>. You will receive a 4-digit handover PIN upon payment to secure your doorstep delivery.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Store Pickup Instructions */
                  <div className="p-4 bg-orange-50/80 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-800/40 rounded-2xl space-y-2 text-xs text-orange-900 dark:text-orange-200 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2">
                      <QrCode size={18} className="text-[#FF5B26] shrink-0" />
                      <strong className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                        Instant Counter QR Pass &amp; 6-Digit PIN
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
                )}

                {/* Price Breakdown Summary */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-150 dark:border-gray-800 space-y-2 text-xs">
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Item Subtotal ({orderQuantity} unit{orderQuantity > 1 ? "s" : ""})</span>
                    <span className="font-mono font-bold text-gray-900 dark:text-white">
                      ₹{((selectedProductForOrder.current_price || selectedProductForOrder.discount_price || 0) * orderQuantity).toFixed(2)}
                    </span>
                  </div>

                  {orderType === "DELIVERY" && (
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1"><Truck size={12}/> Delivery Partner Fee</span>
                      <span className="font-mono font-bold text-gray-900 dark:text-white">
                        ₹{(selectedProductForOrder.shop?.delivery_fee ?? 35).toFixed(2)}
                      </span>
                    </div>
                  )}

                  {selectedProductForOrder.original_price > (selectedProductForOrder.current_price || selectedProductForOrder.discount_price || 0) && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                      <span>Total Rescued MRP Savings</span>
                      <span className="font-mono">
                        -₹{(((selectedProductForOrder.original_price) - (selectedProductForOrder.current_price || selectedProductForOrder.discount_price || 0)) * orderQuantity).toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between items-center text-sm font-black text-gray-900 dark:text-white">
                    <span>Total Amount to Pay</span>
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      ₹{(
                        ((selectedProductForOrder.current_price || selectedProductForOrder.discount_price || 0) * orderQuantity) +
                        (orderType === "DELIVERY" ? (selectedProductForOrder.shop?.delivery_fee ?? 35) : 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Modal CTA Buttons */}
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedProductForOrder(null)}
                    className="flex-1 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 font-bold text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPlacingOrder}
                    className={`flex-[2] py-3.5 rounded-2xl text-white font-black text-xs transition flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50 ${
                      orderType === "DELIVERY"
                        ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30"
                        : "bg-[#FF5B26] hover:bg-[#E54B18] shadow-orange-500/30"
                    }`}
                  >
                    {isPlacingOrder ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Processing Order...</span>
                      </>
                    ) : orderType === "DELIVERY" ? (
                      <>
                        <Smartphone size={16} />
                        <span>Proceed to UPI Payment (₹{(
                          ((selectedProductForOrder.current_price || selectedProductForOrder.discount_price || 0) * orderQuantity) +
                          (selectedProductForOrder.shop?.delivery_fee ?? 35)
                        ).toFixed(0)})</span>
                      </>
                    ) : (
                      <>
                        <QrCode size={16} />
                        <span>Reserve &amp; Get Counter QR Pass</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: UPI Direct Payment Screen for Delivery */}
            {modalStep === "upi_payment" && createdDeliveryOrder && (
              <form onSubmit={handleConfirmUpiPayment} className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                
                {/* Amount to Pay Banner */}
                <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-purple-500/10 to-slate-900/10 border border-emerald-500/20 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Total Amount Due via UPI
                  </span>
                  <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                    ₹{(createdDeliveryOrder.total_price + createdDeliveryOrder.delivery_fee).toFixed(2)}
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                    Order ID: #{createdDeliveryOrder.id.slice(0, 8)} • Delivery to {createdDeliveryOrder.customer_name}
                  </p>
                </div>

                {/* Merchant UPI ID / VPA Details Card */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-[10px]">Merchant UPI VPA</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                      <ShieldCheck size={13} /> Verified Merchant Account
                    </span>
                  </div>

                  {/* Copyable UPI Handle */}
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="font-mono text-xs sm:text-sm font-black text-gray-900 dark:text-white truncate max-w-[240px]">
                      {selectedProductForOrder.shop?.upi_id || "expirygo.deals@okhdfcbank"}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyUpi(selectedProductForOrder.shop?.upi_id || "expirygo.deals@okhdfcbank")}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      {copiedUpi ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copiedUpi ? "Copied!" : "Copy"}</span>
                    </button>
                  </div>

                  {/* QR Code */}
                  <div className="text-center py-2 space-y-2">
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold">
                      Or Scan with GPay / PhonePe / Paytm / BHIM:
                    </p>
                    <div className="bg-white p-3.5 rounded-2xl inline-block shadow-md border border-gray-200">
                      <QRCodeSVG
                        value={`upi://pay?pa=${encodeURIComponent(selectedProductForOrder.shop?.upi_id || "expirygo.deals@okhdfcbank")}&pn=${encodeURIComponent(selectedProductForOrder.shop?.name || "Merchant")}&am=${(createdDeliveryOrder.total_price + createdDeliveryOrder.delivery_fee).toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Meeva Order ${createdDeliveryOrder.id.slice(0, 8)}`)}`}
                        size={140}
                        level="M"
                        includeMargin={false}
                        fgColor="#020617"
                      />
                    </div>
                  </div>

                  {/* Quick App Link */}
                  <a
                    href={`upi://pay?pa=${encodeURIComponent(selectedProductForOrder.shop?.upi_id || "expirygo.deals@okhdfcbank")}&pn=${encodeURIComponent(selectedProductForOrder.shop?.name || "Merchant")}&am=${(createdDeliveryOrder.total_price + createdDeliveryOrder.delivery_fee).toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Meeva Order ${createdDeliveryOrder.id.slice(0, 8)}`)}`}
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm"
                  >
                    <ExternalLink size={14} /> Open Installed UPI App
                  </a>
                </div>

                {/* UTR / Reference ID Entry */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                    Enter 12-Digit UPI Transaction / UTR Ref Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={upiTransactionId}
                    onChange={(e) => setUpiTransactionId(e.target.value)}
                    placeholder="e.g. 425612348901 (from your payment receipt)"
                    className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm font-mono font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  {upiError && (
                    <p className="text-xs text-red-500 flex items-center gap-1 font-medium mt-1">
                      <AlertCircle size={13} /> {upiError}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    Once submitted, the merchant will verify the UTR and dispatch your order. Your 4-digit handover PIN will be active immediately.
                  </p>
                </div>

                {/* UPI Confirmation Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalStep("details")}
                    className="flex-1 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 font-bold text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isReportingPayment || !upiTransactionId.trim()}
                    className="flex-[2] py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 cursor-pointer disabled:opacity-50"
                  >
                    {isReportingPayment ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Verifying Reference...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={16} />
                        <span>Confirm Payment &amp; Get PIN</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* Order Success Screen: Supports both DELIVERY (with 4-Digit Handover PIN) and PICKUP (with QR Pass) */}
      <AnimatePresence>
        {orderSuccessDetails && (
          <div className="fixed inset-0 bg-black/65 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full shadow-2xl border border-emerald-500/30 dark:border-gray-800 overflow-hidden p-6 text-center space-y-4"
            >
              {/* Header Status Badge */}
              <div className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black ${
                orderSuccessDetails.type === "DELIVERY"
                  ? "bg-purple-50 dark:bg-purple-500/10 border border-purple-500/25 text-purple-700 dark:text-purple-300"
                  : "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400"
              }`}>
                {orderSuccessDetails.type === "DELIVERY" ? <Truck size={14} /> : <ShieldCheck size={14} />}
                <span>{orderSuccessDetails.type === "DELIVERY" ? "DOORSTEP DELIVERY CONFIRMED" : "STORE PICKUP PASS READY"}</span>
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-gray-950 dark:text-white">
                  {orderSuccessDetails.type === "DELIVERY" ? "Order Placed Successfully!" : "Reservation Confirmed!"}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {orderSuccessDetails.type === "DELIVERY"
                    ? `Your surplus items are being prepared at ${orderSuccessDetails.shopName}.`
                    : "Show this QR code or 6-digit PIN to the shopkeeper at the counter to collect your item."}
                </p>
              </div>

              {/* Delivery View: 4-Digit Handover PIN */}
              {orderSuccessDetails.type === "DELIVERY" ? (
                <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white p-5 rounded-3xl border border-purple-500/30 shadow-xl space-y-3">
                  <div className="space-y-1 text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-purple-300">
                      4-Digit Doorstep Handover PIN
                    </span>
                    <div className="font-mono text-3xl font-black tracking-[0.4em] text-emerald-400 bg-purple-950/70 py-3 px-6 rounded-2xl border border-purple-500/40 inline-block shadow-inner">
                      {(orderSuccessDetails.deliveryPin || "1234").split("").join(" ")}
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-300 bg-purple-900/20 p-2.5 rounded-xl border border-purple-500/20 leading-relaxed">
                    🔒 <strong>Security Rule:</strong> Share this 4-digit PIN with the delivery person only after receiving and inspecting your items.
                  </p>

                  <div className="text-left text-xs bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/50 space-y-1 text-gray-300">
                    <div className="flex justify-between font-bold text-white">
                      <span className="truncate max-w-[200px]">{orderSuccessDetails.name}</span>
                      <span className="text-emerald-400 font-mono">₹{orderSuccessDetails.price.toFixed(2)}</span>
                    </div>
                    {orderSuccessDetails.deliveryAddress && (
                      <p className="text-[11px] text-gray-400 truncate">
                        📍 <strong>Deliver to:</strong> {orderSuccessDetails.deliveryAddress}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                /* Pickup View: QR Code & 6-Digit PIN */
                <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white p-5 rounded-3xl border border-slate-800 shadow-xl space-y-4">
                  <div className="bg-white p-4 rounded-2xl inline-block shadow-md mx-auto">
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

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      6-Digit Pickup PIN
                    </span>
                    <div className="font-mono text-2xl font-black tracking-[0.35em] text-orange-400 bg-slate-800/90 py-2.5 px-5 rounded-xl border border-slate-700/60 inline-block shadow-inner">
                      {(orderSuccessDetails.pickupCode || "000000").split("").join(" ")}
                    </div>
                  </div>

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
              )}

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setOrderSuccessDetails(null)}
                  className="flex-1 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300 font-bold text-xs py-3.5 rounded-xl transition cursor-pointer"
                >
                  Done
                </button>
                <Link
                  href="/reservations"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-3.5 rounded-xl transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Track My Orders 📦</span>
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
