"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion, useScroll, useSpring } from "framer-motion";
import { 
  MapPin, 
  ArrowRight, 
  Clock, 
  Leaf, 
  Bell, 
  ShieldCheck,
  Sparkles,
  MessageCircle,
  Camera,
  Briefcase,
  Search,
  Store,
  Compass,
  QrCode,
  Locate,
  Flame,
  ChefHat,
  Percent,
  TrendingDown,
  ShoppingBag,
  CheckCircle2,
  Loader2
} from "lucide-react";

import { useConfetti } from "@/hooks/useConfetti";
import { useSound } from "@/hooks/useSound";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import MagneticButton from "@/components/ui/MagneticButton";
import LiveDealsSection from "@/components/products/LiveDealsSection";
import { fetchIpGeolocation } from "@/lib/geolocation";
import { useToast } from "@/components/ui/Toast";
import { apiRequest } from "@/api/client";
import { getProducts } from "@/services/products";
import type { ApiProduct } from "@/types/product";
import { getSafeImageUrl } from "@/lib/images";
import Image from "next/image";

// Dynamically import client components
const HeroMap = dynamic(() => import('@/components/map/HeroMap'), { ssr: false });
const CustomCursor = dynamic(() => import('@/components/ui/CustomCursor'), { ssr: false });

export default function Home() {
  const router = useRouter();
  const [heroSearch, setHeroSearch] = useState("");
  const [locationText, setLocationText] = useState("Chennai, Tamil Nadu");
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [alertEmail, setAlertEmail] = useState("");
  const [alertStatus, setAlertStatus] = useState<"idle" | "loading" | "subscribed">("idle");
  const { triggerConfetti } = useConfetti();
  const { playPopSound } = useSound();
  const toast = useToast();

  // Gap #22: Search Autocomplete Suggestions
  const [suggestions, setSuggestions] = useState<ApiProduct[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    if (!heroSearch.trim() || heroSearch.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const timer = setTimeout(() => {
      setLoadingSuggestions(true);
      getProducts({ q: heroSearch.trim(), limit: 5 })
        .then((items) => {
          setSuggestions(items);
          setShowSuggestions(true);
        })
        .catch(() => setSuggestions([]))
        .finally(() => setLoadingSuggestions(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [heroSearch]);

  // Gap #4 — email subscription posts to backend
  const handleSubscribeAlerts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertEmail || !alertEmail.includes("@")) return;
    setAlertStatus("loading");
    try {
      await apiRequest("/notifications/subscribe", {
        method: "POST",
        json: { email: alertEmail.trim().toLowerCase() },
        skipAuth: true,
      });
    } catch {
      // Fallback: store locally even if backend fails
    }
    try { localStorage.setItem("EXPIRYGO_SUBSCRIBED_EMAIL", alertEmail); } catch {}
    setAlertStatus("subscribed");
    triggerConfetti();
    playPopSound();
  };

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    fetchIpGeolocation()
      .then((data) => {
        if (data.city) {
          setLocationText(`${data.city}, ${data.region || "India"}`);
        }
      })
      .catch(() => {});
  }, []);

  // Gap #5 — GPS coordinates are stored and passed to /deals
  const handleLocateMe = () => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsLocating(false);
          setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationText("Current GPS Location (Live)");
        },
        () => {
          fetchIpGeolocation()
            .then((data) => {
              setIsLocating(false);
              if (data.city) setLocationText(`${data.city}, ${data.region || "India"}`);
            })
            .catch(() => setIsLocating(false));
        }
      );
    } else {
      setIsLocating(false);
    }
  };

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (heroSearch.trim()) params.set("q", heroSearch.trim());
    if (gpsCoords) {
      params.set("lat", String(gpsCoords.lat));
      params.set("lng", String(gpsCoords.lng));
    }
    router.push(`/deals?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFE] text-slate-900 font-sans selection:bg-purple-500/25 overflow-x-hidden relative">
      <CustomCursor />
      
      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-500 origin-left z-[99999] shadow-[0_0_12px_rgba(124,58,237,0.5)]"
        style={{ scaleX }}
      />

      {/* ── LUMINOUS PURPLE & INDIGO AMBIENT GLOWS ── */}
      <div className="absolute top-0 inset-x-0 h-[1100px] overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-32 left-1/4 w-[700px] h-[700px] bg-purple-500/10 rounded-full blur-[160px]" />
        <div className="absolute top-20 right-10 w-[600px] h-[600px] bg-indigo-500/8 rounded-full blur-[180px]" />
        <div className="absolute top-[600px] -left-20 w-[500px] h-[500px] bg-violet-400/10 rounded-full blur-[150px]" />
      </div>

      {/* ── CRISP WHITE GLASSMORPHIC HEADER ── */}
      <header className="pt-4 md:pt-6 px-4 sm:px-6 lg:px-8 max-w-7xl 2xl:max-w-[1440px] mx-auto sticky top-0 z-50">
        <nav className="bg-white/90 backdrop-blur-2xl border border-purple-100/90 rounded-2xl px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-[0_10px_35px_rgba(124,58,237,0.06)] transition-all duration-300">
          
          {/* Logo */}
          <Link href="/" onClick={playPopSound} className="flex items-center gap-3 group cursor-pointer">
            <div className="bg-gradient-to-br from-purple-600 via-indigo-600 to-violet-700 p-2.5 rounded-2xl text-white group-hover:scale-105 transition-transform shadow-md shadow-purple-600/25">
              <Leaf size={22} className="fill-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tight text-slate-900 leading-none">
                Mee<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">va</span>
              </span>
              <span className="text-[10px] font-extrabold text-purple-700/80 uppercase tracking-widest leading-none mt-0.5">
                Surplus Rescue Engine
              </span>
            </div>
          </Link>
          
          {/* Nav Links */}
          <div className="hidden lg:flex items-center gap-5 xl:gap-7 text-sm font-bold text-slate-700">
            <Link href="/deals" onClick={playPopSound} className="hover:text-purple-600 transition-all cursor-pointer flex items-center gap-1.5">
              <Flame size={16} className="text-purple-600" /> Deals Feed
            </Link>
            <Link href="/map" onClick={playPopSound} className="hover:text-purple-600 transition-all cursor-pointer flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-600 animate-ping" />
              Live Radar Map
            </Link>
            <Link href="/pantry" onClick={playPopSound} className="hover:text-purple-600 transition-all cursor-pointer flex items-center gap-1.5">
              <Sparkles size={16} className="text-amber-500" /> AI Pantry
            </Link>
            <Link href="/shop" onClick={playPopSound} className="hover:text-emerald-700 text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-xl transition-all cursor-pointer font-bold text-xs flex items-center gap-1.5">
              <Store size={14} className="text-emerald-600" /> For Merchants
            </Link>
            <Link href="/admin" onClick={playPopSound} className="hover:text-purple-800 text-purple-800 bg-purple-50 border border-purple-200/80 px-3 py-1 rounded-xl transition-all cursor-pointer font-extrabold text-xs flex items-center gap-1">
              <ShieldCheck size={14} /> Admin
            </Link>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <MagneticButton>
              <Link href="/auth?tab=login" onClick={playPopSound} className="text-xs sm:text-sm font-bold text-purple-700 px-3.5 sm:px-5 py-2 sm:py-2.5 border border-purple-200/80 rounded-xl hover:bg-purple-50/80 hover:border-purple-300 transition-all duration-300 cursor-pointer bg-white shadow-2xs">
                Sign in
              </Link>
            </MagneticButton>
            <MagneticButton>
              <Link href="/auth?tab=signup" onClick={playPopSound} className="text-xs sm:text-sm font-black text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-700 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl hover:from-purple-500 hover:to-indigo-500 hover:shadow-[0_6px_20px_rgba(124,58,237,0.35)] transition-all duration-300 cursor-pointer">
                Get Started
              </Link>
            </MagneticButton>
          </div>
        </nav>
      </header>

      {/* ── EXPANSIVE PURPLE & WHITE HERO SECTION (Edge-to-Edge Desktop Terminal) ── */}
      <main className="max-w-7xl 2xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 lg:pt-14 pb-16 lg:pb-24 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 xl:gap-16 items-center">
          
          {/* Left Column: Mission, Headlines, Location Selector & Search */}
          <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left">
            
            {/* Live City Badge */}
            <div className="inline-flex items-center gap-2.5 bg-purple-50 border border-purple-200/90 text-purple-800 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold mb-6 backdrop-blur-md shadow-xs">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-600"></span>
              </span>
              <span>Live in Chennai & 12+ Metro Cities • 240+ Verified Stores</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-[4.2rem] xl:text-[4.8rem] font-black tracking-tight mb-6 leading-[1.06] text-slate-900">
              Rescue surplus food.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-700">Shop hyper-local</span> deals at <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500">70% off.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg lg:text-xl text-slate-600 max-w-2xl mb-8 font-medium leading-relaxed">
              Near-expiry surplus groceries, artisan bakery breads, and dairy from local supermarkets — at up to <span className="font-extrabold text-purple-700">70% off</span>. Save money, support neighborhood shops, and discover great daily deals.
            </p>

            {/* Integrated Location & Keyword Search Bar with Autocomplete (Gap #22) */}
            <div className="w-full max-w-2xl relative mb-4">
              <form 
                onSubmit={handleHeroSearch}
                className="w-full bg-white dark:bg-gray-900 p-2.5 rounded-2xl border border-purple-200/90 dark:border-gray-800 shadow-[0_12px_40px_rgba(124,58,237,0.08)] flex flex-col sm:flex-row items-stretch gap-2"
              >
                {/* Location Pill */}
                <div className="flex items-center gap-2.5 px-3.5 py-3 bg-purple-50/70 dark:bg-gray-800/80 hover:bg-purple-50 rounded-xl border border-purple-100 dark:border-gray-700 text-slate-800 dark:text-gray-200 sm:w-5/12 transition">
                  <MapPin size={18} className="text-purple-600 shrink-0" />
                  <input
                    type="text"
                    value={locationText}
                    onChange={(e) => setLocationText(e.target.value)}
                    className="w-full bg-transparent text-xs sm:text-sm font-bold text-slate-800 dark:text-gray-200 outline-none truncate"
                    placeholder="Location / Area..."
                  />
                  <button
                    type="button"
                    onClick={handleLocateMe}
                    disabled={isLocating}
                    title="Auto GPS"
                    className="text-slate-400 hover:text-purple-600 p-0.5 cursor-pointer shrink-0"
                  >
                    <Locate size={16} className={isLocating ? "animate-spin text-purple-600" : ""} />
                  </button>
                </div>

                {/* Keyword Search */}
                <div className="flex items-center gap-2.5 px-3 py-3 bg-transparent flex-1">
                  <Search size={18} className="text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search sourdough, milk, yogurt, paneer..."
                    value={heroSearch}
                    onChange={(e) => setHeroSearch(e.target.value)}
                    onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                    className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-800 dark:text-white placeholder-slate-400 outline-none"
                  />
                </div>

                {/* Search Button */}
                <button
                  type="submit"
                  className="px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-purple-600/20 transition active:scale-95 cursor-pointer shrink-0"
                >
                  Find Deals
                </button>
              </form>

              {/* Autocomplete Dropdown */}
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white dark:bg-gray-900 rounded-2xl border border-purple-100 dark:border-gray-800 shadow-2xl p-2 overflow-hidden">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-1.5">
                    <span>Surplus Suggestions</span>
                    {loadingSuggestions && <Loader2 size={12} className="animate-spin text-purple-600" />}
                  </div>
                  {suggestions.length === 0 && !loadingSuggestions ? (
                    <div className="p-4 text-center text-xs text-slate-400 font-medium">
                      No matching items found. Press Enter to search across all shops.
                    </div>
                  ) : (
                    <div className="space-y-1 mt-1">
                      {suggestions.map((deal) => (
                        <button
                          key={deal.id}
                          type="button"
                          onClick={() => {
                            setShowSuggestions(false);
                            router.push(`/deals?q=${encodeURIComponent(deal.name)}`);
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-purple-50 dark:hover:bg-gray-800 transition text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-gray-800 relative overflow-hidden shrink-0">
                              <Image
                                src={getSafeImageUrl(deal.front_image_url)}
                                alt={deal.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{deal.name}</p>
                              <p className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">{deal.category}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0 pl-3">
                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">₹{deal.discount_price.toFixed(0)}</span>
                            <span className="text-[10px] text-slate-400 line-through ml-1.5">₹{deal.original_price.toFixed(0)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Category Quick Selector Chips */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-8 text-xs font-bold text-slate-600">
              <span className="text-slate-400 font-medium">Quick Filters:</span>
              <Link href="/deals?cat=bakery" className="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-100 transition">🥐 Bakery</Link>
              <Link href="/deals?cat=dairy" className="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-100 transition">🥛 Dairy</Link>
              <Link href="/deals?cat=produce" className="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-100 transition">🥗 Produce</Link>
              <Link href="/deals?cat=meat" className="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-100 transition">🥩 Meat</Link>
              <Link href="/pantry" className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-100 transition">✨ AI Recipe Matcher</Link>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3.5 w-full mb-10">
              <MagneticButton className="w-full sm:w-auto">
                <Link href="/deals" onClick={playPopSound} className="w-full sm:w-auto flex justify-center items-center gap-2 px-7 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-bold hover:from-purple-500 hover:to-indigo-500 hover:shadow-[0_8px_25px_rgba(124,58,237,0.35)] transition-all duration-300 transform cursor-pointer text-base shadow-md shadow-purple-600/20">
                  <MapPin size={20} />
                  Browse Live Deals
                </Link>
              </MagneticButton>
              <MagneticButton className="w-full sm:w-auto">
                <Link href="/map" onClick={playPopSound} className="w-full sm:w-auto flex justify-center items-center gap-2 px-7 py-4 bg-white border-2 border-purple-200 text-purple-900 rounded-2xl font-bold hover:bg-purple-50/70 hover:border-purple-300 transition-all duration-300 transform cursor-pointer text-base shadow-xs">
                  <Compass size={20} className="text-purple-600" />
                  Live Radar Map
                </Link>
              </MagneticButton>
              <MagneticButton className="w-full sm:w-auto">
                <Link href="/shop/setup" onClick={playPopSound} className="w-full sm:w-auto flex justify-center items-center gap-2 px-6 py-4 bg-white border border-slate-200 text-slate-800 rounded-2xl font-bold hover:bg-slate-50 transition-all duration-300 cursor-pointer text-base shadow-2xs">
                  <Store size={18} className="text-purple-600" />
                  List your shop <ArrowRight size={18} />
                </Link>
              </MagneticButton>
            </div>

            {/* Real Impact Proof Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-purple-100 w-full">
              <div>
                <div className="text-xl sm:text-2xl font-black text-slate-900">⭐ 4.9 / 5</div>
                <div className="text-xs font-bold text-slate-500">2,400+ reviews</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-purple-700">240+ Stores</div>
                <div className="text-xs font-bold text-slate-500">Verified local shops</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-indigo-700">15.5 Tons</div>
                <div className="text-xs font-bold text-slate-500">CO₂ emissions saved</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-violet-700">Zero Fees</div>
                <div className="text-xs font-bold text-slate-500">Instant UPI & pickup</div>
              </div>
            </div>

          </div>

          {/* Right Column: Live Interactive Deal Radar Terminal Card */}
          <div className="lg:col-span-5 w-full">
            <div className="w-full h-[480px] sm:h-[520px] lg:h-[550px] xl:h-[580px] relative rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(124,58,237,0.12)] border-2 border-purple-200/90 bg-white">
              
              {/* Floating Top Radar Status Bar */}
              <div className="absolute top-4 inset-x-4 z-20 flex items-center justify-between pointer-events-none">
                <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-purple-200 shadow-md flex items-center gap-2 pointer-events-auto">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-ping" />
                  <span className="text-xs font-black text-slate-900 tracking-tight">
                    📡 Live Neighbourhood Deal Radar
                  </span>
                </div>
                <Link
                  href="/map"
                  className="bg-purple-600 hover:bg-purple-500 text-white px-3.5 py-2 rounded-2xl shadow-md text-xs font-bold transition flex items-center gap-1 pointer-events-auto"
                >
                  Full Map <ArrowRight size={14} />
                </Link>
              </div>

              {/* Embedded Interactive Map Canvas */}
              <HeroMap />

              {/* Floating Bottom Quick Deal Preview Card */}
              <div className="absolute bottom-4 inset-x-4 z-20 pointer-events-none">
                <div className="bg-white/95 backdrop-blur-xl p-3.5 rounded-2xl border border-purple-100 shadow-xl flex items-center justify-between gap-3 pointer-events-auto">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-xl shrink-0">
                      🥐
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900 leading-tight">Fresh Sourdough Bread (2 left)</p>
                      <p className="text-[11px] font-semibold text-purple-700 mt-0.5">Green Valley Supermarket • 2.4 km</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                      70% OFF
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* ── 4 PROPRIETARY FEATURE SHOWCASE PILLARS ── */}
      <section className="max-w-7xl 2xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10 border-t border-purple-100">
        <div className="mb-10 text-center md:text-left">
          <span className="text-xs font-black text-purple-600 uppercase tracking-widest mb-1 block">Platform Pillars</span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">How Meeva Works</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Pillar 1: Dynamic Markdown Deals */}
          <div className="bg-white border border-purple-100 rounded-3xl p-6 hover:border-purple-300 hover:shadow-lg transition-all duration-300 flex flex-col justify-between shadow-xs">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 mb-4">
                <Percent size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Auto-Dynamic Markdowns</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                As expiry dates draw near (24h to 48h), prices drop automatically up to 70% off.
              </p>
            </div>
            <Link href="/deals" className="mt-6 text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1">
              Browse Active Deals <ArrowRight size={14} />
            </Link>
          </div>

          {/* Pillar 2: Hyper-Local Radar */}
          <div className="bg-white border border-purple-100 rounded-3xl p-6 hover:border-purple-300 hover:shadow-lg transition-all duration-300 flex flex-col justify-between shadow-xs">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 mb-4">
                <Compass size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">GPS Deal Radar</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Explore verified neighborhood stores within walking distance with live store pins.
              </p>
            </div>
            <Link href="/map" className="mt-6 text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              Open Store Map <ArrowRight size={14} />
            </Link>
          </div>

          {/* Pillar 3: AI Recipe Cook */}
          <div className="bg-white border border-purple-100 rounded-3xl p-6 hover:border-purple-300 hover:shadow-lg transition-all duration-300 flex flex-col justify-between shadow-xs">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4">
                <ChefHat size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">AI Zero-Waste Chef</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Bundle leftover surplus ingredients into chef-crafted gourmet meals in seconds.
              </p>
            </div>
            <Link href="/pantry" className="mt-6 text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1">
              Try Recipe Cook <ArrowRight size={14} />
            </Link>
          </div>

          {/* Pillar 4: QR Instant Pickup */}
          <div className="bg-white border border-purple-100 rounded-3xl p-6 hover:border-purple-300 hover:shadow-lg transition-all duration-300 flex flex-col justify-between shadow-xs">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-600 mb-4">
                <QrCode size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Instant QR Pickup</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Reserve in 1 click, show your 6-digit pickup code at the store counter, and take it home.
              </p>
            </div>
            <Link href="/reservations" className="mt-6 text-xs font-bold text-violet-600 hover:text-violet-700 flex items-center gap-1">
              View Cart & Pickups <ArrowRight size={14} />
            </Link>
          </div>

        </div>
      </section>

      {/* ── LIVE NEIGHBOURHOOD DEALS SECTION ── */}
      <LiveDealsSection />

      {/* ── IMPACT & ESG SUSTAINABILITY METRICS ── */}
      <section className="max-w-7xl 2xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20 relative z-10">
        <div className="bg-gradient-to-br from-[#1E1B4B] via-[#2E1065] to-[#0F172A] rounded-3xl p-8 sm:p-12 lg:p-16 text-white shadow-2xl relative overflow-hidden">
          
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-3xl mb-12 relative z-10">
            <span className="text-xs sm:text-sm font-black text-purple-400 tracking-widest uppercase mb-2 block">
              Sustainability & Carbon Impact
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-4">
              Real Impact. Measurable Waste Reduction.
            </h2>
            <p className="text-purple-200/80 text-base sm:text-lg font-medium">
              Every item you rescue prevents methane emissions from organic landfill decomposition while saving you hard-earned money.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
            <div className="bg-white/10 border border-white/15 rounded-2xl p-6 backdrop-blur-md">
              <div className="text-4xl sm:text-5xl font-black text-purple-300 mb-2 flex items-baseline">
                <AnimatedCounter value={6.2} decimals={1} />
                <span className="text-xl ml-1">tons</span>
              </div>
              <p className="text-sm font-bold text-purple-100">Surplus groceries rescued this month</p>
            </div>

            <div className="bg-white/10 border border-white/15 rounded-2xl p-6 backdrop-blur-md">
              <div className="text-4xl sm:text-5xl font-black text-indigo-300 mb-2 flex items-baseline">
                <AnimatedCounter value={15.5} decimals={1} />
                <span className="text-xl ml-1">tons</span>
              </div>
              <p className="text-sm font-bold text-purple-100">CO₂ greenhouse emissions saved</p>
            </div>

            <div className="bg-white/10 border border-white/15 rounded-2xl p-6 backdrop-blur-md">
              <div className="text-4xl sm:text-5xl font-black text-pink-300 mb-2 flex items-baseline">
                <AnimatedCounter value={18} prefix="₹" suffix="L+" />
              </div>
              <p className="text-sm font-bold text-purple-100">Saved by smart shoppers in Chennai</p>
            </div>

            <div className="bg-white/10 border border-white/15 rounded-2xl p-6 backdrop-blur-md">
              <div className="text-4xl sm:text-5xl font-black text-violet-300 mb-2 flex items-baseline">
                <AnimatedCounter value={240} suffix="+" />
              </div>
              <p className="text-sm font-bold text-purple-100">Registered local supermarkets & bakeries</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY MEEVA SECTION ── */}
      <section className="max-w-7xl 2xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-16 pb-28 relative z-10">
        <div className="mb-12">
          <span className="text-xs sm:text-sm font-black text-purple-600 tracking-widest uppercase mb-2 block">
            Why Choose Meeva
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900">
            Built for Smart Consumers & Local Merchants
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: MapPin, color: "text-purple-600", bg: "bg-purple-50", title: "Hyper-Local Deal Radar", desc: "Discover nearby surplus inventory from walking-distance bakeries and supermarkets with live GPS." },
            { icon: Clock, color: "text-indigo-600", bg: "bg-indigo-50", title: "Real Expiry Countdown", desc: "Visual urgency indicators show exactly how many hours remain — total transparency with zero guessing." },
            { icon: Sparkles, color: "text-amber-600", bg: "bg-amber-50", title: "AI Recipe Suggestions", desc: "Got surplus items? Our built-in AI Chef generates delicious, creative recipes instantly." },
            { icon: Leaf, color: "text-emerald-600", bg: "bg-emerald-50", title: "Personal Eco Milestone", desc: "Track every kilogram of CO₂ you save and earn green shopper achievement badges." },
            { icon: Bell, color: "text-pink-600", bg: "bg-pink-50", title: "Instant Clearance Alerts", desc: "Get notified immediately when your favourite shopkeeper posts a 70% clearance deal." },
            { icon: ShieldCheck, color: "text-blue-600", bg: "bg-blue-50", title: "100% Verified Stores", desc: "Every shop is verified with OpenStreetMap and platform administrator identity checks." }
          ].map((feature, i) => (
            <div key={i} className="bg-white border border-purple-100/90 p-8 rounded-3xl shadow-xs hover:shadow-lg transition-all duration-300">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${feature.bg}`}>
                <feature.icon className={feature.color} size={28} />
              </div>
              <h4 className="font-extrabold text-xl mb-2 text-slate-900">{feature.title}</h4>
              <p className="text-slate-600 text-sm leading-relaxed font-medium">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── LUXURY PURPLE FOOTER ── */}
      <footer className="bg-[#0F111E] text-white pt-20 pb-12 border-t border-purple-950">
        <div className="max-w-7xl 2xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-16">
            
            <div className="lg:col-span-2">
              <Link href="/" className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white font-black">
                  <Leaf size={18} />
                </div>
                <span className="text-2xl font-black tracking-tight text-white">
                  Mee<span className="text-purple-400">va</span>
                </span>
              </Link>
              <p className="text-slate-400 text-sm leading-relaxed max-w-sm mb-6 font-medium">
                The smart hyper-local surplus food rescue engine. Connecting conscious shoppers with neighborhood supermarkets and bakeries for great daily savings.
              </p>
              <div className="flex gap-3">
                <Link href="/deals" title="Shopper Community" className="w-10 h-10 rounded-full bg-white/10 hover:bg-purple-600 flex items-center justify-center text-white transition">
                  <MessageCircle size={18} />
                </Link>
                <Link href="/mobile" title="Mobile App & QR Scanner" className="w-10 h-10 rounded-full bg-white/10 hover:bg-purple-600 flex items-center justify-center text-white transition">
                  <Camera size={18} />
                </Link>
                <Link href="/shop/setup" title="Register Store as Partner" className="w-10 h-10 rounded-full bg-white/10 hover:bg-purple-600 flex items-center justify-center text-white transition">
                  <Briefcase size={18} />
                </Link>
              </div>
            </div>

            <div>
              <h4 className="text-white font-black text-xs uppercase tracking-widest mb-4">Platform</h4>
              <ul className="space-y-3 text-sm font-semibold text-slate-400">
                <li><Link href="/deals" className="hover:text-purple-400 transition">Deals Feed</Link></li>
                <li><Link href="/map" className="hover:text-purple-400 transition">Store Radar Map</Link></li>
                <li><Link href="/pantry" className="hover:text-purple-400 transition">AI Digital Pantry</Link></li>
                <li><Link href="/reservations" className="hover:text-purple-400 transition">Pickup Cart & Reservations</Link></li>
                <li><Link href="/checkout" className="hover:text-purple-400 transition">Express Checkout</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-black text-xs uppercase tracking-widest mb-4">For Merchants</h4>
              <ul className="space-y-3 text-sm font-semibold text-slate-400">
                <li><Link href="/shop/setup" className="hover:text-purple-400 transition">Register Store (Partner)</Link></li>
                <li><Link href="/shop" className="hover:text-purple-400 transition">Merchant Portal & Dashboard</Link></li>
                <li><Link href="/shop/products" className="hover:text-purple-400 transition">Inventory & Dynamic Pricing</Link></li>
                <li><Link href="/shop/reservations" className="hover:text-purple-400 transition">Order Pickup Verification</Link></li>
                <li><Link href="/admin" className="hover:text-purple-400 transition">Admin Moderation</Link></li>
                <li><Link href="/mobile" className="hover:text-purple-400 transition">Mobile App & Scanner Hub</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-black text-xs uppercase tracking-widest mb-4">Clearance Alerts</h4>
              <p className="text-xs text-slate-400 mb-3">Get instant 70% off clearance flash alerts direct to your inbox.</p>
              {alertStatus === "subscribed" ? (
                <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex flex-col gap-1.5 animate-fadeIn">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Subscribed Successfully!
                  </div>
                  <p className="text-[11px] text-zinc-300">
                    Flash clearance alerts will be sent to <strong className="text-white font-mono">{alertEmail}</strong>.
                  </p>
                  <button
                    onClick={() => setAlertStatus("idle")}
                    className="text-[10px] text-zinc-400 hover:text-white underline text-left mt-1 cursor-pointer"
                  >
                    Register another email
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubscribeAlerts} className="flex flex-col gap-2">
                  <input 
                    type="email" 
                    value={alertEmail}
                    onChange={(e) => setAlertEmail(e.target.value)}
                    placeholder="Enter your email..."
                    required
                    className="bg-white/5 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-400 transition"
                  />
                  <button 
                    type="submit" 
                    disabled={alertStatus === "loading"}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    {alertStatus === "loading" ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Subscribing...
                      </>
                    ) : (
                      "Subscribe Free"
                    )}
                  </button>
                </form>
              )}
            </div>

          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <p>&copy; {new Date().getFullYear()} Meeva Technologies Inc. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/privacy" className="hover:text-slate-300 transition">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-slate-300 transition">Terms of Service</Link>
              <Link href="/sustainability" className="hover:text-slate-300 transition">Sustainability Disclosure</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
