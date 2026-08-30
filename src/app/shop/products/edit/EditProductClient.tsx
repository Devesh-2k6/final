"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Save, Image as ImageIcon, Calendar, ArrowLeft, Loader2, Trash2, Sliders, Info, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthenticationContext";
import { getErrorMessage } from "@/api/errors";
import { getProducts, updateProduct, uploadImage, optimizeProductDetails, scanProductDates } from "@/services/products";
import { getMyShop } from "@/services/shops";
import { ApiProductCreate, ProductCategory } from "@/types/product";

const CATEGORIES: ProductCategory[] = ["BAKERY", "DAIRY", "PRODUCE", "MEAT", "PANTRY", "PREPARED_FOOD", "OTHER"];

export default function EditProductClient({ id }: { id: string }) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // Redirect if not authenticated or not shop owner
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !user?.is_shop_owner)) {
      router.push("/auth?role=shop_owner&tab=login");
    }
  }, [authLoading, isAuthenticated, user, router]);

  const [shopId, setShopId] = useState<string | undefined>(undefined);
  const [loadingProduct, setLoadingProduct] = useState(true);

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
  const [scanMessage, setScanMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleScanDates = async (fileToScan?: File) => {
    const file = fileToScan || expiryImageFile;
    if (!file) {
      alert("Please upload a new expiry date image first to scan.");
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

  // 1. Get Shop ID
  useEffect(() => {
    getMyShop()
      .then((s) => setShopId(s.id))
      .catch(() => setShopId(undefined));
  }, []);

  // 2. Fetch Product Details
  useEffect(() => {
    if (!shopId || !id) return;
    setLoadingProduct(true);
    getProducts({ shopId, hideExpired: false })
      .then((prods) => {
        const found = prods.find((p) => p.id === id);
        if (found) {
          setProductName(found.name);
          setOriginalPrice(found.original_price.toString());
          setQuantity(found.quantity.toString());
          setManufacturingDate(found.manufacturing_date.split("T")[0]);
          setExpiryDate(found.expiry_date.split("T")[0]);
          setCategory(found.category);
          setDescription(found.description || "");
          setFrontImage(found.front_image_url);
          setExpiryImage(found.expiry_image_url);
          setAutoDiscountEnabled(found.auto_discount_enabled);
          setAutoDiscountMinPrice(found.auto_discount_min_price?.toString() || "");
        } else {
          setError("Product deal not found in your store.");
        }
        setLoadingProduct(false);
      })
      .catch((err) => {
        setError("Failed to load product details: " + getErrorMessage(err));
        setLoadingProduct(false);
      });
  }, [shopId, id]);

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

  // Live discount calculations based on the selected expiry date
  const preview = useMemo(() => {
    const mrp = parseFloat(originalPrice);
    if (isNaN(mrp) || mrp <= 0 || !expiryDate) return null;
    
    try {
      const expDate = new Date(expiryDate);
      expDate.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffTime = expDate.getTime() - today.getTime();
      const daysLeft = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      let discountPercent = 0;
      if (daysLeft <= 2) {
        discountPercent = 70;
      } else if (daysLeft <= 5) {
        discountPercent = 50;
      } else if (daysLeft <= 10) {
        discountPercent = 30;
      } else {
        discountPercent = 10;
      }
      
      const discountPrice = mrp * (1 - discountPercent / 100);
      return {
        percent: discountPercent,
        price: Math.max(0, parseFloat(discountPrice.toFixed(2))),
        daysLeft,
      };
    } catch {
      return null;
    }
  }, [originalPrice, expiryDate]);

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

    if (!productName || !originalPrice || !quantity || !manufacturingDate || !expiryDate || !frontImage || !expiryImage) {
      setError("Please fill out all mandatory fields and upload both product images.");
      return;
    }

    // Validate dates
    const mfgDate = new Date(manufacturingDate);
    const expDate = new Date(expiryDate);
    
    if (mfgDate >= expDate) {
      setError("Manufacturing date must be before expiry date.");
      return;
    }

    const minPriceVal = parseFloat(autoDiscountMinPrice);
    if (autoDiscountEnabled) {
      if (isNaN(minPriceVal) || minPriceVal <= 0) {
        setError("Please enter a valid minimum discount price.");
        return;
      }
      if (preview && minPriceVal >= preview.price) {
        setError("Minimum discount price must be strictly less than the initial discounted price.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // 1. Upload images if new files were selected, otherwise reuse existing URLs
      const uploadedFrontUrl = frontImageFile ? await uploadImage(frontImageFile) : frontImage;
      const uploadedExpiryUrl = expiryImageFile ? await uploadImage(expiryImageFile) : expiryImage;

      // 2. Update product
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

      await updateProduct(id, productData);
      
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Product Deal</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Modify near-expiry product details</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 py-8 pb-24">
        {error ? (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl p-6 text-center">
            <p className="text-red-700 dark:text-red-400 font-bold mb-4">{error}</p>
            <Link href="/shop/products" className="inline-flex bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl transition">
              Back to Products
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Success Message */}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400"
              >
                ✓ Product deal updated successfully! Redirecting...
              </motion.div>
            )}

            {/* Product Info Section */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Sliders size={20} className="text-emerald-500" />
                Product Details
              </h2>

              {/* Product Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g., Organic Milk 1L"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

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
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Discount updates automatically based on the selected expiry date.
                </p>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="1"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Dates & Live Preview Section */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar size={20} className="text-emerald-500" />
                Dates & Discount Preview
              </h2>

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

              {/* Live Discount Calculator Preview */}
              <AnimatePresence>
                {preview && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="mt-4 p-5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 space-y-3"
                  >
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm mb-1">
                      <Sparkles size={16} />
                      Live Discount Estimate
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white dark:bg-gray-800/40 p-3 rounded-xl border border-emerald-100/30">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Days Left</p>
                        <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{preview.daysLeft} day(s)</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800/40 p-3 rounded-xl border border-emerald-100/30">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Discount Percent</p>
                        <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{preview.percent}% Off</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center border-t border-emerald-100/50 dark:border-emerald-500/10 pt-3">
                      <span className="text-sm font-bold text-gray-600 dark:text-gray-300">Initial Discount Price</span>
                      <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        ₹{preview.price.toFixed(2)}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Dynamic Price Drop Section */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Sliders size={20} className="text-emerald-500" />
                    Dynamic Price Drop
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Enable continuous price reduction in the final 24 hours.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoDiscountEnabled}
                    onChange={(e) => setAutoDiscountEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              <AnimatePresence>
                {autoDiscountEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <div className="pt-2">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Minimum Price at Expiry (₹) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required={autoDiscountEnabled}
                        value={autoDiscountMinPrice}
                        onChange={(e) => setAutoDiscountMinPrice(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 flex items-center gap-1">
                        <Info size={12} className="text-gray-400" />
                        Must be strictly lower than the initial discounted price.
                      </p>
                    </div>

                    {preview && autoDiscountMinPrice && parseFloat(autoDiscountMinPrice) > 0 && (
                      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200/60 dark:border-gray-700/50 rounded-2xl space-y-3">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                          Price Timeline (Final 24 Hours)
                        </div>
                        <div className="relative pt-6 pb-2 px-1">
                          <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full relative">
                            <div className="absolute inset-y-0 left-0 right-0 bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full" />
                          </div>
                          <div className="flex justify-between items-center text-xs font-bold mt-3">
                            <div className="text-left">
                              <p className="text-gray-400 text-[10px] uppercase">24 hrs left</p>
                              <p className="text-emerald-600 dark:text-emerald-400 mt-0.5">₹{preview.price.toFixed(2)}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-gray-400 text-[10px] uppercase">12 hrs left</p>
                              <p className="text-gray-700 dark:text-gray-300 mt-0.5">
                                ₹{((preview.price + parseFloat(autoDiscountMinPrice)) / 2).toFixed(2)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-gray-400 text-[10px] uppercase">Expiry (0 hrs)</p>
                              <p className="text-amber-600 dark:text-amber-500 mt-0.5">
                                ₹{parseFloat(autoDiscountMinPrice).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
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
                        <img src={expiryImage} alt="Preview" className="h-32 w-32 object-cover rounded-xl border" />
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
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3.5 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
