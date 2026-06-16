"use client";

import { useState, useEffect } from "react";
import { getMyShop } from "@/services/shops";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Store, MapPin, CheckCircle2, Loader2, Navigation, Info, ShoppingBag, Search } from "lucide-react";
import Map from "@/components/Map";
import { createShop } from "@/services/shops";
import { fetchIpGeolocation } from "@/lib/geolocation";

interface OsmSuggestion {
  display_name: string;
  lat: string;
  lon: string;
}

export default function ShopSetupPage() {
  const router = useRouter();
  
  const [shopName, setShopName] = useState("");
  const [shopType, setShopType] = useState("grocery");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  
  const [suggestions, setSuggestions] = useState<OsmSuggestion[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSearchAddress = async () => {
    if (!address.trim()) return;
    setIsSearchingAddress(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&addressdetails=1&limit=5`,
        {
          headers: {
            "User-Agent": "ExpiryGo-App",
          },
        }
      );
      const data = await res.json();
      setSuggestions(data || []);
      if (!data || data.length === 0) {
        alert("No address suggestions found. Please verify the address spelling or set location manually.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to fetch address suggestions. Please set location manually.");
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const handleSelectSuggestion = (sug: OsmSuggestion) => {
    setAddress(sug.display_name);
    setLatitude(parseFloat(sug.lat));
    setLongitude(parseFloat(sug.lon));
    setSuggestions([]);
  };

  // Shop type options
  useEffect(() => {
    getMyShop()
      .then(() => router.replace("/shop"))
      .catch(() => {});
  }, [router]);

  const shopTypes = [
    { id: "grocery", label: "Grocery Store", icon: ShoppingBag },
    { id: "bakery", label: "Bakery", icon: Store },
    { id: "cafe", label: "Cafe", icon: Store },
    { id: "supermarket", label: "Supermarket", icon: Store },
  ];

  const handleGetLocation = () => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          setIsLocating(false);
        },
        (error) => {
          console.warn("GPS failed, falling back to IP geolocation:", error);
          fetchIpGeolocation()
            .then(data => {
              setLatitude(data.latitude);
              setLongitude(data.longitude);
            })
            .catch(() => alert("Could not get location. " + error.message))
            .finally(() => setIsLocating(false));
        }
      );
    } else {
      fetchIpGeolocation()
        .then(data => {
          setLatitude(data.latitude);
          setLongitude(data.longitude);
        })
        .catch(() => alert("Geolocation is not supported by your browser."))
        .finally(() => setIsLocating(false));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // start submitting
    setIsSubmitting(true);
    // Validate
    if (!shopName || !address) {
      alert("Please fill out the required fields.");
      setIsSubmitting(false);
      return;
    }
    try {
      await createShop({
        name: shopName,
        address: address,
        description: description,
        latitude: latitude || 0,
        longitude: longitude || 0,
      });
      setIsSuccess(true);
      // redirect after success animation
      setTimeout(() => {
        router.push("/shop");
      }, 2000);
    } catch (error) {
      console.error(error);
      alert("Failed to create shop. You may already have one.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-emerald-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white dark:bg-gray-800 p-10 rounded-3xl shadow-2xl flex flex-col items-center text-center max-w-sm w-full"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <CheckCircle2 size={80} className="text-emerald-500 mb-6" />
          </motion.div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Shop Created!</h2>
          <p className="text-gray-500 dark:text-gray-400">
            Welcome to FreshSave, {shopName}. Let&apos;s start saving food.
          </p>
          <Loader2 size={24} className="animate-spin text-emerald-500 mt-8" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col pt-12 pb-24 px-4 sm:px-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="max-w-xl w-full mx-auto relative z-10">
        
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex bg-emerald-100 dark:bg-emerald-900/50 p-3 rounded-2xl mb-4 shadow-sm">
            <Store size={32} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">Setup Your Shop</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">Tell us about your business so customers can find you.</p>
        </div>

        <motion.div 
          variants={pageVariants}
          initial="initial"
          animate="animate"
          className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 sm:p-10"
        >
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Step 1: Basic Info */}
            <div className="space-y-5">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-3">Basic Details</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Shop Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="e.g. Green Valley Market" 
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Shop Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {shopTypes.map((type) => {
                    const Icon = type.icon;
                    const isSelected = shopType === type.id;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setShopType(type.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                          isSelected 
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" 
                            : "border-gray-100 dark:border-gray-700 hover:border-emerald-200 dark:hover:border-emerald-800 text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        <Icon size={18} />
                        <span className="text-sm font-semibold">{type.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What kind of products do you usually sell?" 
                  rows={3}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition resize-none"
                />
              </div>
            </div>

            {/* Step 2: Location */}
            <div className="space-y-5">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-3 flex items-center gap-2">
                <MapPin size={20} className="text-emerald-500" /> Location
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Street Address <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input 
                      type="text" 
                      value={address}
                      onChange={(e) => {
                        setAddress(e.target.value);
                        if (suggestions.length > 0) setSuggestions([]);
                      }}
                      placeholder="e.g. 123 Main St, London" 
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSearchAddress}
                    disabled={isSearchingAddress || !address.trim()}
                    className="px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSearchingAddress ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Search size={16} />
                    )}
                    Search
                  </button>
                </div>
                
                {suggestions.length > 0 && (
                  <div className="mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden z-20 relative max-h-60 overflow-y-auto">
                    {suggestions.map((sug, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectSuggestion(sug)}
                        className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-sm border-b border-gray-50 dark:border-gray-700/50 last:border-none text-gray-700 dark:text-gray-300 font-medium transition"
                      >
                        {sug.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Info size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-blue-800 dark:text-blue-300 mb-3">
                      We need your exact coordinates so customers can find your deals on the map.
                    </p>
                    <button 
                      type="button" 
                      onClick={handleGetLocation}
                      disabled={isLocating}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded-lg px-4 py-2 font-semibold text-sm transition hover:bg-blue-50 dark:hover:bg-gray-700 disabled:opacity-50"
                    >
                      {isLocating ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : latitude !== null ? (
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      ) : (
                        <Navigation size={16} />
                      )}
                      {latitude !== null ? "Update Current Location" : "Get Current Location"}
                    </button>
                    {latitude !== null && (
                      <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-500">
                        <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mb-2 font-mono">
                          {latitude.toFixed(4)}, {longitude?.toFixed(4)}
                        </p>
                        <div className="h-48 w-full rounded-xl overflow-hidden border border-blue-200 dark:border-blue-700 shadow-inner">
                          <Map lat={latitude} lng={longitude ?? 0} zoom={15} popupText={shopName || "Your Shop Location"} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <motion.button 
              type="submit"
              disabled={isSubmitting}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-4 font-bold text-lg shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 mt-8 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Creating Shop...
                </>
              ) : (
                "Complete Setup"
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
