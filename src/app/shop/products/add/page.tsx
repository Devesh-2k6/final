"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Plus,
  Image as ImageIcon,
  Calendar,
  ArrowLeft,
  Loader2,
  Trash2,
  Sliders,
  Info,
  Sparkles,
  Barcode,
  Scan,
  X,
  Mic,
  MicOff,
  Volume2,
  Languages,
  CheckCircle2,
  Play,
  Search,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthenticationContext";
import { getErrorMessage } from "@/api/errors";
import { createProduct, uploadImage, optimizeProductDetails, scanProductDates, lookupBarcode, parseVoiceProductListing } from "@/services/products";
import { getMyShop, type ShopWithDescription } from "@/services/shops";
import type { ApiProductCreate, ProductCategory } from "@/types/product";

const CATEGORIES: ProductCategory[] = ["BAKERY", "DAIRY", "PRODUCE", "MEAT", "PANTRY", "PREPARED_FOOD", "OTHER"];

export default function AddProductPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [shop, setShop] = useState<ShopWithDescription | null>(null);

  // Redirect if not authenticated or not shop owner
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user?.is_shop_owner)) {
      router.push("/auth?role=shop_owner&tab=login");
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    getMyShop()
      .then(setShop)
      .catch(() => setShop(null));
  }, []);

  const [productName, setProductName] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [manufacturingDate, setManufacturingDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [category, setCategory] = useState<ProductCategory>("OTHER");
  const [description, setDescription] = useState("");
  
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [expiryImage, setExpiryImage] = useState<string | null>(null);
  const [frontImageFile, setFrontImageFile] = useState<File | null>(null);
  const [expiryImageFile, setExpiryImageFile] = useState<File | null>(null);

  const [autoDiscountEnabled, setAutoDiscountEnabled] = useState(false);
  const [autoDiscountMinPrice, setAutoDiscountMinPrice] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isScanningBarcode, setIsScanningBarcode] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Barcode Lookup Modal State
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");

  // AI Multilingual Voice Assistant State
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceLang, setVoiceLang] = useState<"ta-IN" | "hi-IN" | "en-IN" | "te-IN">("ta-IN");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [isParsingVoice, setIsParsingVoice] = useState(false);
  const [voiceSuccessMsg, setVoiceSuccessMsg] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const startSpeechRecognition = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert("Browser speech recognition is not supported in this browser. You can select one of the quick test voice prompts or type the spoken sentence directly.");
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = voiceLang;
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceTranscript("");
      };

      recognition.onresult = (event: any) => {
        let current = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          current += event.results[i][0].transcript;
        }
        setVoiceTranscript(current);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition notice:", event);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error("Speech recognition startup error:", e);
      setIsListening(false);
    }
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore
      }
      setIsListening(false);
    }
  };

  const handleProcessVoice = async (overrideText?: string) => {
    const textToProcess = (overrideText || voiceTranscript).trim();
    if (!textToProcess) {
      alert("Please speak or enter a voice transcript first.");
      return;
    }

    setIsParsingVoice(true);
    setError("");
    setVoiceSuccessMsg(null);

    try {
      const res = await parseVoiceProductListing(textToProcess, voiceLang);
      if (res.name) setProductName(res.name);
      if (res.category) setCategory(res.category);
      if (res.quantity) setQuantity(String(res.quantity));
      if (res.original_price) setOriginalPrice(String(res.original_price));
      if (res.manufacturing_date) setManufacturingDate(res.manufacturing_date);
      if (res.expiry_date) setExpiryDate(res.expiry_date);
      if (res.description) setDescription(res.description);
      if (res.discount_price) {
        setAutoDiscountMinPrice(String(res.discount_price));
        setAutoDiscountEnabled(true);
      }

      setVoiceSuccessMsg(`✓ ${res.spoken_summary || "Parsed voice listing successfully!"}`);
      setScanMessage(`🎙️ AI Voice Added: ${res.name} (Qty: ${res.quantity}, ₹${res.discount_price})`);

      setTimeout(() => {
        setVoiceModalOpen(false);
        setVoiceSuccessMsg(null);
      }, 1800);
    } catch (err: unknown) {
      setError("Failed to parse voice input: " + getErrorMessage(err));
    } finally {
      setIsParsingVoice(false);
    }
  };

  const handleLookupBarcode = async (barcodeToSearch?: string) => {
    const code = (barcodeToSearch || manualBarcode).trim();
    if (!code) {
      setError("Please enter a barcode number to lookup.");
      return;
    }
    setIsScanningBarcode(true);
    setScanMessage("");
    setError("");
    try {
      const result = await lookupBarcode(code);
      if (result.name) setProductName(result.name);
      if (result.category) setCategory(result.category);
      if (result.description) setDescription(result.description);
      setBarcodeModalOpen(false);
      setManualBarcode("");
      setScanMessage(`Barcode ${code} found: "${result.name || "Product"}". Details auto-filled.`);
    } catch (err: any) {
      console.warn("Barcode lookup notice:", err);
      setError(`No catalog entry found for barcode ${code}. You can enter product details manually.`);
    } finally {
      setIsScanningBarcode(false);
    }
  };

  const handleScanDates = async (fileToScan?: File) => {
    const file = fileToScan || expiryImageFile;
    if (!file) {
      alert("Please upload an expiry date image first.");
      return;
    }
    setIsScanning(true);
    setScanMessage("");
    setError("");
    try {
      const result = await scanProductDates(file);
      if (result.manufacturing_date) {
        setManufacturingDate(result.manufacturing_date);
      }
      if (result.expiry_date) {
        setExpiryDate(result.expiry_date);
      }
      if (result.manufacturing_date || result.expiry_date) {
        setScanMessage(
          `AI scanned dates successfully! Mfg: ${result.manufacturing_date || "Not detected"}, Exp: ${result.expiry_date || "Not detected"}`
        );
      } else {
        setError("AI could not detect any dates in this image. Please enter them manually.");
      }
    } catch (err) {
      console.error(err);
      setError("AI date scan failed. Please enter the dates manually.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleAIOptimize = async () => {
    if (!productName.trim()) {
      alert("Please enter a product name first before optimizing.");
      return;
    }
    
    setIsOptimizing(true);
    setError("");
    
    try {
      const today = new Date().toISOString().split("T")[0];
      const inSevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      
      const res = await optimizeProductDetails({
        name: productName.trim(),
        mfg_date: manufacturingDate || today,
        expiry_date: expiryDate || inSevenDays,
        original_price: parseFloat(originalPrice) || 0,
        quantity: parseInt(quantity, 10) || 1
      });
      
      if (res.suggested_description) {
        setDescription(res.suggested_description);
      }
    } catch (err) {
      console.error(err);
      setError("AI optimization failed: " + getErrorMessage(err));
    } finally {
      setIsOptimizing(false);
    }
  };

  const frontImageInputRef = useRef<HTMLInputElement>(null);
  const expiryImageInputRef = useRef<HTMLInputElement>(null);

  // Live dynamic clearance pricing based on MRP, Floor Price, Expiry Time, and Stock Quantity
  const preview = useMemo(() => {
    const mrp = parseFloat(originalPrice);
    if (isNaN(mrp) || mrp <= 0 || !expiryDate) return null;
    
    try {
      const expDate = new Date(expiryDate);
      expDate.setHours(23, 59, 59, 999);
      const today = new Date();
      const diffMs = expDate.getTime() - today.getTime();
      const hoursLeft = Math.max(0, diffMs / (1000 * 60 * 60));
      const daysLeft = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      
      const floorInput = parseFloat(autoDiscountMinPrice);
      // Floor price: if user provided a valid floor <= mrp, use it; otherwise default to 70% of MRP
      const minFloor = !isNaN(floorInput) && floorInput > 0 ? Math.min(mrp, floorInput) : Math.round(mrp * 0.7 * 100) / 100;
      const headroom = mrp - minFloor;
      
      // 1. Time Factor (concave decay over active 7-day / 168-hr window)
      const maxWindowHours = 168.0;
      const normalizedTime = Math.min(1.0, Math.max(0.0, hoursLeft / maxWindowHours));
      const timeFactor = 1.0 - Math.pow(normalizedTime, 0.65);
      
      // 2. Quantity / Stock Velocity Factor
      const qtyNum = Math.max(1, parseInt(quantity, 10) || 1);
      const qtyFactor = Math.min(1.20, Math.max(0.85, 0.85 + 0.05 * Math.log(qtyNum + 1)));
      
      // Combined clearance progress (0.0 to 1.0)
      const clearanceProgress = Math.min(1.0, Math.max(0.0, timeFactor * qtyFactor));
      const calculatedDealPrice = mrp - (headroom * clearanceProgress);
      const currentDealPrice = Math.max(minFloor, Math.min(mrp, calculatedDealPrice));
      const discountPercent = Math.round(((mrp - currentDealPrice) / mrp) * 100);
      
      return {
        mrp,
        minFloor,
        price: parseFloat(currentDealPrice.toFixed(2)),
        percent: discountPercent,
        daysLeft,
        hoursLeft: Math.round(hoursLeft),
        qtyNum,
        headroom,
      };
    } catch {
      return null;
    }
  }, [originalPrice, expiryDate, autoDiscountMinPrice, quantity]);

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setPreviewImg: (val: string) => void,
    setFile: (file: File) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImg(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!productName || !originalPrice || !quantity || !manufacturingDate || !expiryDate || !frontImageFile || !expiryImageFile) {
      setError("Please fill out all mandatory fields and upload both product images.");
      return;
    }

    const mrpVal = parseFloat(originalPrice);
    if (isNaN(mrpVal) || mrpVal <= 0) {
      setError("Please enter a valid MRP price.");
      return;
    }

    // Validate dates
    const mfgDate = new Date(manufacturingDate);
    const expDate = new Date(expiryDate);
    
    if (mfgDate >= expDate) {
      setError("Manufacturing date must be before expiry date.");
      return;
    }

    if (expDate <= new Date()) {
      setError("Expiry date must be in the future.");
      return;
    }

    const minPriceVal = parseFloat(autoDiscountMinPrice);
    if (autoDiscountMinPrice && !isNaN(minPriceVal)) {
      if (minPriceVal <= 0) {
        setError("Lowest acceptable price must be greater than 0.");
        return;
      }
      if (minPriceVal > mrpVal) {
        setError(`Lowest acceptable price (₹${minPriceVal}) cannot be higher than MRP price (₹${mrpVal}).`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // 1. Upload images
      const uploadedFrontUrl = await uploadImage(frontImageFile);
      const uploadedExpiryUrl = await uploadImage(expiryImageFile);

      // 2. Create product (discount is calculated automatically on backend)
      const productData: ApiProductCreate = {
        name: productName.trim(),
        original_price: parseFloat(originalPrice),
        quantity: parseInt(quantity, 10),
        manufacturing_date: manufacturingDate + "T00:00:00",
        expiry_date: expiryDate + "T23:59:59",
        category,
        front_image_url: uploadedFrontUrl,
        expiry_image_url: uploadedExpiryUrl,
        voice_note_url: null,
        description: description.trim() || null,
        is_surprise_bag: false,
        auto_discount_enabled: autoDiscountEnabled,
        auto_discount_min_price: autoDiscountEnabled ? minPriceVal : null,
      };

      await createProduct(productData);
      
      setSuccess(true);
      setTimeout(() => {
        router.push("/shop/products");
      }, 2000);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/shop/products" className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add Product Deal</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Upload near-expiry product for discount</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 py-8 pb-24">
        {/* Pending Approval Warning Banner */}
        {shop && shop.approval_status !== "APPROVED" && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start gap-3">
            <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
            <div className="space-y-1">
              <h4 className="text-sm font-bold">Admin Approval Required</h4>
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                Your store (<strong>{shop.name}</strong>) is currently <strong>{shop.approval_status}</strong>. An administrator must approve your merchant account in the Admin Console before deal publishing is unlocked.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Success Message */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400"
            >
              ✓ Product uploaded successfully! Redirecting...
            </motion.div>
          )}

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-400"
            >
              {error}
            </motion.div>
          )}

          {/* AI Multilingual Voice Assistant Banner */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 rounded-3xl p-5 sm:p-6 text-white shadow-xl shadow-emerald-900/10 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-emerald-400/30">
            <div className="space-y-1.5 relative z-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-emerald-100 font-black text-xs uppercase tracking-wider">
                <Sparkles size={13} className="text-amber-300" /> AI Multilingual Voice Listing
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                Speak to Add Deal in 1-Click
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100 max-w-lg font-medium">
                Speak in <span className="font-bold underline decoration-amber-300">Tamil, Hindi, Telugu, or English</span>. AI auto-fills product name, dates, category, and discounts instantly!
              </p>
            </div>

            <button
              type="button"
              onClick={() => setVoiceModalOpen(true)}
              className="relative z-10 inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-2xl bg-white text-emerald-900 font-black text-sm hover:bg-emerald-50 active:scale-95 transition shadow-lg shadow-black/10 cursor-pointer self-start sm:self-center shrink-0"
            >
              <Mic size={18} className="text-emerald-600 animate-pulse" />
              Start Voice Listing
            </button>
          </div>

          {/* Product Info Section */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Plus size={20} className="text-emerald-500" />
                Product Details
              </h2>
              <button
                type="button"
                onClick={() => setVoiceModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition"
              >
                <Mic size={13} className="text-emerald-600 dark:text-emerald-400" />
                Voice Input
              </button>
            </div>

            {/* Product Name */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setBarcodeModalOpen(true)}
                  disabled={isScanningBarcode}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50 disabled:opacity-50 transition-all"
                >
                  <Barcode size={12} className="text-emerald-600 dark:text-emerald-400" />
                  Lookup Barcode
                </button>
              </div>
              <input
                type="text"
                required
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g., Organic Milk 1L"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0) + cat.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <button
                  type="button"
                  onClick={handleAIOptimize}
                  disabled={isOptimizing || !productName.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/30 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isOptimizing ? (
                    <>
                      <Loader2 size={12} className="animate-spin text-purple-600 dark:text-purple-400" />
                      Optimizing...
                    </>
                  ) : (
                    <>
                      <Sparkles size={12} className="text-purple-600 dark:text-purple-400" />
                      AI Optimize
                    </>
                  )}
                </button>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the product condition, brand, and why it's a great deal..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>

            {/* Price & Quantity Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* MRP Price */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  MRP Price (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  Original box / retail price.
                </p>
              </div>

              {/* Lowest Acceptable Price (Floor) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Lowest Acceptable Price (₹) <span className="text-emerald-500 font-normal text-xs">(Floor)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={autoDiscountMinPrice}
                  onChange={(e) => {
                    setAutoDiscountMinPrice(e.target.value);
                    setAutoDiscountEnabled(true);
                  }}
                  placeholder="e.g. 30.00"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  Your minimum cost floor. Price will <strong className="text-emerald-600 dark:text-emerald-400">never</strong> drop below this.
                </p>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Stock Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="1"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  Units available for rescue.
                </p>
              </div>
            </div>
          </div>

          {/* Dates & Live Dynamic Pricing Section */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar size={20} className="text-emerald-500" />
              Dates & Dynamic Clearance Pricing
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Manufacturing Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Manufacturing Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={manufacturingDate}
                  onChange={(e) => setManufacturingDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Expiry Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Live Dynamic Pricing Preview Card */}
            <AnimatePresence>
              {preview && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mt-4 p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                      <Sparkles size={16} className="animate-pulse" />
                      Dynamic Clearance Pricing
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                      Time & Stock Adaptive
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white dark:bg-gray-800/60 p-3 rounded-xl border border-emerald-100/40">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Time Left</p>
                      <p className={`text-sm font-black mt-0.5 ${preview.daysLeft <= 2 ? "text-red-500" : "text-emerald-600"}`}>
                        {preview.daysLeft === 0 ? "Expiring Today" : `${preview.daysLeft} Days`}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800/60 p-3 rounded-xl border border-emerald-100/40">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Stock Velocity</p>
                      <p className="text-sm font-black text-gray-800 dark:text-gray-200 mt-0.5">
                        {preview.qtyNum} {preview.qtyNum === 1 ? "unit" : "units"}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800/60 p-3 rounded-xl border border-emerald-100/40">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Protected Floor</p>
                      <p className="text-sm font-black text-amber-600 dark:text-amber-400 mt-0.5">
                        ₹{preview.minFloor.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-emerald-100/60 dark:border-emerald-500/10 pt-3">
                    <div>
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Starting Deal Price (Today)</span>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        {preview.percent}% discount from MRP ₹{preview.mrp.toFixed(2)}
                      </p>
                    </div>
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      ₹{preview.price.toFixed(2)}
                    </span>
                  </div>

                  {/* Dynamic Timeline Bar */}
                  <div className="p-3.5 bg-white dark:bg-gray-800/80 border border-emerald-100/60 dark:border-gray-700/60 rounded-xl space-y-2">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex justify-between">
                      <span>Clearance Price Decay Timeline</span>
                      <span className="text-emerald-600 dark:text-emerald-400">Never Drops Below ₹{preview.minFloor.toFixed(2)}</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full relative overflow-hidden">
                      <div className="absolute inset-y-0 left-0 right-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500 rounded-full" />
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-bold mt-1">
                      <div className="text-left">
                        <p className="text-gray-400 text-[9px] uppercase">MRP</p>
                        <p className="text-gray-600 dark:text-gray-300">₹{preview.mrp.toFixed(2)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-emerald-600 dark:text-emerald-400 text-[9px] uppercase font-bold">Today (Deal Price)</p>
                        <p className="text-emerald-600 dark:text-emerald-400 font-extrabold">₹{preview.price.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-amber-500 text-[9px] uppercase font-bold">At Expiry (Floor)</p>
                        <p className="text-amber-600 dark:text-amber-400 font-extrabold">₹{preview.minFloor.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Images Section */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ImageIcon size={20} className="text-emerald-500" />
              Product Images
            </h2>

            {/* Front Image */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Product Front Image <span className="text-red-500">*</span>
              </label>
              <div
                onClick={() => frontImageInputRef.current?.click()}
                className="relative border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-8 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 transition-all"
              >
                {frontImage ? (
                  <div className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={frontImage} alt="Preview" className="h-32 w-32 object-cover rounded-xl border" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFrontImage(null);
                        setFrontImageFile(null);
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <ImageIcon size={32} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Click to upload product front image</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">PNG, JPG up to 10MB</p>
                  </div>
                )}
                <input
                  ref={frontImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, setFrontImage, setFrontImageFile)}
                  className="hidden"
                />
              </div>
            </div>

            {/* Expiry Image */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Expiry Date Image <span className="text-red-500">*</span>
              </label>
              <div
                onClick={() => expiryImageInputRef.current?.click()}
                className="relative border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-8 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 transition-all"
              >
                {expiryImage ? (
                  <div className="space-y-4">
                    <div className="relative inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={expiryImage} alt="Preview" className="h-32 w-32 object-cover rounded-xl border border-gray-200 dark:border-gray-700" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpiryImage(null);
                          setExpiryImageFile(null);
                          setScanMessage("");
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleScanDates();
                        }}
                        disabled={isScanning}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50 disabled:opacity-50 transition"
                      >
                        {isScanning ? (
                          <>
                            <Loader2 size={16} className="animate-spin text-emerald-600 dark:text-emerald-400" />
                            Scanning Label...
                          </>
                        ) : (
                          <>
                            <Sparkles size={16} className="text-emerald-600 dark:text-emerald-400" />
                            AI Scan Dates from Photo
                          </>
                        )}
                      </button>
                    </div>
                    {scanMessage && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50/50 dark:bg-emerald-500/5 p-2 rounded-lg">
                        ✓ {scanMessage}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <ImageIcon size={32} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Click to upload expiry date image</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">PNG, JPG up to 10MB</p>
                  </div>
                )}
                <input
                  ref={expiryImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setExpiryImageFile(file);
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setExpiryImage(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                      handleScanDates(file);
                    }
                  }}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-4 -mx-4 px-4 shadow-md z-10">
            <div className="max-w-3xl mx-auto flex gap-3">
              <Link
                href="/shop/products"
                className="flex-1 px-6 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition text-center"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || (shop !== null && shop.approval_status !== "APPROVED")}
                className="flex-1 px-6 py-3.5 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Uploading...
                  </>
                ) : shop && shop.approval_status !== "APPROVED" ? (
                  <>
                    <AlertTriangle size={18} />
                    Pending Admin Approval
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    Upload Product
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
      {/* AI Multilingual Voice Assistant Modal */}
      <AnimatePresence>
        {voiceModalOpen && (
          <div className="fixed inset-0 bg-black/65 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative my-8"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                    <Mic size={22} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">
                      AI Voice Assistant
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      Speak in Tamil, Hindi, Telugu, or English
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    stopSpeechRecognition();
                    setVoiceModalOpen(false);
                  }}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Language Selection Pills */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Languages size={13} className="text-emerald-500" /> Select Spoken Language
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "ta-IN" as const, label: "தமிழ்", sub: "Tamil" },
                    { id: "hi-IN" as const, label: "हिंदी", sub: "Hindi" },
                    { id: "en-IN" as const, label: "English", sub: "India" },
                    { id: "te-IN" as const, label: "తెలుగు", sub: "Telugu" },
                  ].map((lang) => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => setVoiceLang(lang.id)}
                      className={`p-2.5 rounded-2xl border text-center transition-all ${
                        voiceLang === lang.id
                          ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20 font-black"
                          : "bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-emerald-300 font-semibold"
                      }`}
                    >
                      <div className="text-xs sm:text-sm">{lang.label}</div>
                      <div className={`text-[10px] ${voiceLang === lang.id ? "text-emerald-100" : "text-gray-400"}`}>
                        {lang.sub}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pulsating Microphone Control */}
              <div className="flex flex-col items-center justify-center py-4 bg-gradient-to-b from-gray-50 to-emerald-50/30 dark:from-gray-800/40 dark:to-emerald-950/20 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700/80">
                <button
                  type="button"
                  onClick={isListening ? stopSpeechRecognition : startSpeechRecognition}
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl ${
                    isListening
                      ? "bg-red-500 text-white shadow-red-500/40 scale-105 animate-pulse"
                      : "bg-emerald-500 text-white shadow-emerald-500/30 hover:scale-105 active:scale-95"
                  }`}
                >
                  {isListening && (
                    <span className="absolute inset-0 rounded-full bg-red-400 opacity-40 animate-ping" />
                  )}
                  {isListening ? <MicOff size={32} /> : <Mic size={32} />}
                </button>
                <div className="mt-3 text-center">
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    {isListening ? "Listening... Speak now!" : "Tap microphone to speak"}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {isListening ? "Speak name, quantity, expiry time, and price" : "Or select a test prompt below"}
                  </div>
                </div>
              </div>

              {/* Live Transcript / Edit Box */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center justify-between uppercase tracking-wider">
                  <span>Recognized Transcript</span>
                  {voiceTranscript && (
                    <button
                      type="button"
                      onClick={() => setVoiceTranscript("")}
                      className="text-[11px] text-gray-400 hover:text-red-500 font-semibold"
                    >
                      Clear
                    </button>
                  )}
                </label>
                <textarea
                  value={voiceTranscript}
                  onChange={(e) => setVoiceTranscript(e.target.value)}
                  placeholder="e.g. 5 packets Aavin milk expiring tomorrow at 5pm original price 40 discount 20..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs sm:text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none font-medium"
                />
              </div>

              {/* Multilingual Voice Prompts */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  ⚡ Multilingual Voice Prompts (1-Tap):
                </div>
                <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                  {[
                    {
                      lang: "ta-IN" as const,
                      badge: "தமிழ்",
                      text: "5 பாக்கெட் ஆவின் பால் நாளை மாலை 5 மணிக்கு காலாவதியாகிறது அசல் விலை 40 தள்ளுபடி 20",
                    },
                    {
                      lang: "hi-IN" as const,
                      badge: "हिंदी",
                      text: "5 पैकेट दूध कल शाम 5 बजे एक्सपायर हो रहा है असली कीमत 40 रुपये डिस्काउंट 20",
                    },
                    {
                      lang: "en-IN" as const,
                      badge: "English",
                      text: "5 packets of Aavin milk expiring tomorrow 5pm original price 40 discount price 20",
                    },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setVoiceLang(preset.lang);
                        setVoiceTranscript(preset.text);
                        handleProcessVoice(preset.text);
                      }}
                      className="w-full text-left p-2 rounded-xl bg-gray-50 hover:bg-emerald-50/80 dark:bg-gray-800/70 dark:hover:bg-emerald-950/30 border border-gray-200/70 dark:border-gray-700 transition flex items-center justify-between text-xs group"
                    >
                      <span className="truncate pr-2 text-gray-700 dark:text-gray-300 font-medium">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 mr-1.5">[{preset.badge}]</span>
                        {preset.text}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:translate-x-0.5 transition">
                        Run ➔
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback Success Message */}
              {voiceSuccessMsg && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl p-3 text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2"
                >
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  <span>{voiceSuccessMsg}</span>
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    stopSpeechRecognition();
                    setVoiceModalOpen(false);
                  }}
                  className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition text-xs sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isParsingVoice || !voiceTranscript.trim()}
                  onClick={() => handleProcessVoice()}
                  className="flex-1 px-4 py-3 rounded-2xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 text-xs sm:text-sm"
                >
                  {isParsingVoice ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      AI Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Auto-Fill Form
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Barcode Catalog Lookup Modal */}
      <AnimatePresence>
        {barcodeModalOpen && (
          <div className="fixed inset-0 bg-black/65 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 relative"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                    <Barcode size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-gray-900 dark:text-white">Lookup Barcode</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Search database & open food catalog</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBarcodeModalOpen(false)}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600 dark:text-gray-300">
                  Barcode Number (EAN-13, UPC, Code 128)
                </label>
                <input
                  type="text"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleLookupBarcode();
                    }
                  }}
                  placeholder="e.g. 8901234567890"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white font-mono"
                  autoFocus
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBarcodeModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isScanningBarcode || !manualBarcode.trim()}
                  onClick={() => handleLookupBarcode()}
                  className="flex-1 px-4 py-2.5 rounded-2xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 disabled:opacity-50 transition flex items-center justify-center gap-2 text-xs shadow-md shadow-emerald-500/20"
                >
                  {isScanningBarcode ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search size={14} />
                      Lookup Item
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
