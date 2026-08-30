"use client";

import { useState, useEffect, useCallback, ChangeEvent } from "react";
import { getMyShop, createShop, uploadShopDocument, verifyShopLocation, type ShopLocationVerifyResponse } from "@/services/shops";
import { useAuth } from "@/contexts/AuthenticationContext";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Store,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShoppingBag,
  ShieldCheck,
  Sparkles,
  FileText,
  UploadCloud,
  FileCheck,
  X,
} from "lucide-react";
import InteractiveMapPicker from "@/components/map/InteractiveMapPicker";

const SAMPLE_FOOD_SHOPS = [
  {
    label: "🛒 Spencer Plaza Supermarket (Chennai)",
    name: "Spencer Plaza Store",
    type: "supermarket",
    address: "Anna Salai, Thousand Lights, Chennai, Tamil Nadu, 600002, India",
    lat: 13.06158,
    lon: 80.26094,
    description: "Supermarket offering fresh bakery goods, dairy, vegetables, and beverages.",
  },
  {
    label: "🍰 Devi Sweets & Bakery (Delhi)",
    name: "Devi Sweets & Bakery",
    type: "bakery",
    address: "Connaught Place, New Delhi, Delhi, 110001, India",
    lat: 28.6304,
    lon: 77.2177,
    description: "Fresh daily artisan bread, bakery items, pastries, and sweets.",
  },
  {
    label: "🥗 Green Valley Organics (Bengaluru)",
    name: "Green Valley Supermarket",
    type: "grocery",
    address: "MG Road, Bengaluru, Karnataka, 560001, India",
    lat: 12.9716,
    lon: 77.5946,
    description: "Organic groceries, farm milk, fresh fruits, and daily essentials.",
  },
  {
    label: "☕ Nilgiris Bakery & Dairy (Chennai)",
    name: "Nilgiris Fresh Mart",
    type: "grocery",
    address: "T. Nagar, Chennai, Tamil Nadu, 600017, India",
    lat: 13.0418,
    lon: 80.2341,
    description: "Dairy, fresh cakes, cookies, juices, and packaged groceries.",
  },
];

export default function ShopSetupPage() {
  const router = useRouter();
  const { user } = useAuth();

  const isEmailVerified = user?.email_verified ?? false;

  const [shopName, setShopName] = useState("");
  const [shopType, setShopType] = useState("grocery");
  const [address, setAddress] = useState("Anna Salai, Chennai, Tamil Nadu, India");
  const [description, setDescription] = useState("");

  const [latitude, setLatitude] = useState<number>(13.06158);
  const [longitude, setLongitude] = useState<number>(80.26094);

  // Document Upload State
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [docFilename, setDocFilename] = useState<string | null>(null);
  const [docUploading, setDocUploading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  // Location Verification State
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "verifying" | "verified" | "pending_review">("idle");
  const [verifyNotice, setVerifyNotice] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Check if shop already exists
  useEffect(() => {
    getMyShop()
      .then((shop) => {
        if (shop && shop.id) {
          router.replace("/shop");
        }
      })
      .catch(() => {});
  }, [router]);

  const shopTypes = [
    { id: "grocery", label: "Grocery / Kirana", icon: ShoppingBag },
    { id: "bakery", label: "Bakery & Sweets", icon: Store },
    { id: "supermarket", label: "Supermarket", icon: Store },
    { id: "cafe", label: "Cafe & Eatery", icon: Store },
  ];

  const runLocationVerification = useCallback(
    async (nameToVerify: string, addrToVerify: string, lat: number, lon: number) => {
      if (!nameToVerify.trim() || !addrToVerify.trim()) return;
      setVerifyStatus("verifying");

      try {
        const res = await verifyShopLocation({
          name: nameToVerify,
          address: addrToVerify,
          latitude: lat,
          longitude: lon,
        });
        if (res.verified) {
          setVerifyStatus("verified");
          setVerifyNotice(`Verified on OpenStreetMap: ${res.matched_business_name || nameToVerify}`);
        } else {
          setVerifyStatus("pending_review");
          setVerifyNotice(
            res.message || "Location will be submitted for Admin Review & Approval."
          );
        }
      } catch {
        setVerifyStatus("pending_review");
        setVerifyNotice("Location will be submitted for Admin Review upon completion.");
      }
    },
    []
  );

  const handleApplyPreset = (preset: (typeof SAMPLE_FOOD_SHOPS)[0]) => {
    setShopName(preset.name);
    setShopType(preset.type);
    setAddress(preset.address);
    setDescription(preset.description);
    setLatitude(preset.lat);
    setLongitude(preset.lon);

    if (isEmailVerified) {
      runLocationVerification(preset.name, preset.address, preset.lat, preset.lon);
    }
  };

  const handleLocationPicked = (loc: { lat: number; lng: number; address?: string }) => {
    setLatitude(loc.lat);
    setLongitude(loc.lng);
    if (loc.address) {
      setAddress(loc.address);
    }
    if (shopName.trim() && isEmailVerified) {
      runLocationVerification(shopName, loc.address || address, loc.lat, loc.lng);
    }
  };

  const handleDocumentChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setDocError("File exceeds 10MB limit. Please upload a smaller document.");
      return;
    }

    setDocFile(file);
    setDocError(null);
    setDocUploading(true);

    try {
      const res = await uploadShopDocument(file);
      setDocUrl(res.document_url);
      setDocFilename(res.filename);
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err ? String(err.message) : "Failed to upload document.";
      setDocError(msg);
      setDocFile(null);
    } finally {
      setDocUploading(false);
    }
  };

  const handleRemoveDoc = () => {
    setDocFile(null);
    setDocUrl(null);
    setDocFilename(null);
    setDocError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!isEmailVerified) {
      alert("Please verify your email address before setting up a store.");
      setIsSubmitting(false);
      return;
    }

    if (!shopName.trim() || !address.trim()) {
      alert("Please fill out all required fields.");
      setIsSubmitting(false);
      return;
    }

    try {
      await createShop({
        name: shopName.trim(),
        address: address.trim(),
        description: description.trim(),
        latitude,
        longitude,
        verification_document_url: docUrl,
        verification_document_name: docFilename,
      });
      setIsSuccess(true);
      setTimeout(() => {
        router.push("/shop");
      }, 1500);
    } catch (error: unknown) {
      console.error(error);
      const errMsg =
        error && typeof error === "object" && "message" in error
          ? String(error.message)
          : "Failed to create shop.";
      alert(`Notice: ${errMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Shop Application Submitted!</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <strong>{shopName}</strong> has been submitted for <strong>Admin Review & Verification</strong>.
          </p>
          <Loader2 size={24} className="animate-spin text-emerald-500 mt-8" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col pt-12 pb-24 px-4 sm:px-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-3xl w-full mx-auto relative z-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex bg-emerald-100 dark:bg-emerald-900/50 p-3 rounded-2xl mb-4 shadow-sm">
            <Store size={32} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Merchant Store Setup
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400 text-sm">
            Configure your store details, GPS map pin, and business credentials for marketplace review.
          </p>
        </div>

        <motion.div
          variants={pageVariants}
          initial="initial"
          animate="animate"
          className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 sm:p-10"
        >
          {/* Quick Presets for Demo Testing */}
          <div className="mb-8 p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
            <div className="flex items-center gap-2 text-xs font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-2">
              <Sparkles size={14} /> Quick Demo Food Locations (1-Click Fill)
            </div>
            <p className="text-xs text-slate-600 dark:text-gray-400 mb-3 font-medium">
              Click any verified food landmark below to auto-fill details and GPS pin:
            </p>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_FOOD_SHOPS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="bg-white dark:bg-gray-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 text-xs font-bold py-1.5 px-3 rounded-xl transition shadow-sm cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Step 1: Basic Info */}
            <div className="space-y-5">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-bold">1</span>
                Store Information
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Store / Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="e.g. Spencer Plaza Supermarket / Devi Sweets"
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Food Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {shopTypes.map((type) => {
                    const Icon = type.icon;
                    const isSelected = shopType === type.id;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setShopType(type.id)}
                        className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : "border-gray-100 dark:border-gray-700 hover:border-emerald-200 dark:hover:border-emerald-800 text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        <Icon size={16} />
                        <span className="text-xs font-bold">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What surplus food items do you sell? (e.g., Artisan baked goods, dairy, fresh vegetables)"
                  rows={2}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition resize-none text-sm"
                />
              </div>
            </div>

            {/* Step 2: Interactive Map & Location */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-bold">2</span>
                  <MapPin size={20} className="text-emerald-500" /> Interactive Store Map Location
                </h3>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Drag pin or search address
                </span>
              </div>

              {/* Interactive Leaflet Map Picker Component */}
              <InteractiveMapPicker
                initialLat={latitude}
                initialLng={longitude}
                initialAddress={address}
                shopName={shopName || "Your Store"}
                onLocationSelect={handleLocationPicked}
                className="w-full h-80 sm:h-96"
              />

              {/* Street Address Input (Synced with Map) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1">
                  Selected Street Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street address of your shop"
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition text-xs font-medium"
                  required
                />
              </div>

              {/* Verification Status Banner */}
              {verifyStatus === "verifying" && (
                <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 flex items-center gap-2.5 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500 flex-shrink-0" />
                  <span>Checking OpenStreetMap food classification...</span>
                </div>
              )}

              {verifyStatus === "verified" && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center gap-2 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>{verifyNotice || "Food business location verified on OpenStreetMap!"}</span>
                </div>
              )}

              {verifyStatus === "pending_review" && (
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-slate-700 dark:text-gray-300 flex items-start gap-2.5 text-xs">
                  <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-800 dark:text-emerald-300">Ready for Review: </span>
                    <span>Coordinates ({latitude.toFixed(4)}, {longitude.toFixed(4)}) will be registered for Admin Moderation.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Verification Document Upload */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-bold">3</span>
                <ShieldCheck size={20} className="text-emerald-500" /> Food Business Verification Document
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Upload your <strong>FSSAI License</strong>, <strong>GST Certificate</strong>, <strong>Trade Registration</strong>, or <strong>Storefront Photo</strong> to expedite approval.
              </p>

              {docUrl ? (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500 text-white">
                      <FileCheck size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {docFilename || "Verification Document"}
                      </p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                        Document uploaded and attached successfully
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveDoc}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 transition"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-6 text-center transition cursor-pointer relative bg-gray-50/50 dark:bg-gray-900/50">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={handleDocumentChange}
                    disabled={docUploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center gap-2">
                    {docUploading ? (
                      <Loader2 size={32} className="animate-spin text-emerald-500" />
                    ) : (
                      <UploadCloud size={32} className="text-emerald-500" />
                    )}
                    <p className="text-xs font-bold text-slate-800 dark:text-white">
                      {docUploading ? "Uploading Document..." : "Click or drag document to upload"}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-gray-400">
                      Supports PDF, PNG, JPG, WEBP (Max 10MB)
                    </p>
                  </div>
                </div>
              )}

              {docError && (
                <p className="text-xs text-red-600 font-semibold">{docError}</p>
              )}
            </div>

            <motion.button
              type="submit"
              disabled={isSubmitting || !isEmailVerified}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl py-4 font-black text-base shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 mt-8 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Submitting Store Application...
                </>
              ) : !isEmailVerified ? (
                "⚠️ Verify Email to Complete Setup"
              ) : (
                "Submit Store for Admin Approval"
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
