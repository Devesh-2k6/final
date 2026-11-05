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
  Search,
  AlertTriangle,
  Zap,
  ShoppingBag,
  UtensilsCrossed,
  Check,
  Store,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthenticationContext";
import { getErrorMessage } from "@/api/errors";
import { createProduct, uploadImage, optimizeProductDetails, scanProductDates, lookupBarcode } from "@/services/products";
import { getMyShop, type ShopWithDescription } from "@/services/shops";
import type { ApiProductCreate, ProductCategory } from "@/types/product";
import { useToast } from "@/components/ui/Toast";

const CATEGORIES: ProductCategory[] = ["BAKERY", "DAIRY", "PRODUCE", "MEAT", "PANTRY", "PREPARED_FOOD", "OTHER"];

interface PresetItem {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  originalPrice: number;
  floorPrice: number;
  validDays: number;
  defaultQty: number;
  description: string;
  accentColor: string;
  tag: string;
  mode: "GROCERY" | "HOTEL";
  iconText: string;
}

const PRESET_ITEMS: PresetItem[] = [
  // Kirana & Supermarket Presets
  {
    id: "amul-milk-500",
    name: "Amul Taaza Toned Milk (500ml)",
    brand: "Amul Dairy",
    category: "DAIRY",
    originalPrice: 27,
    floorPrice: 18,
    validDays: 2,
    defaultQty: 6,
    description: "Fresh pasteurized toned milk pouch. Chilled and sealed, perfect for tea, coffee, curd, or daily cooking.",
    accentColor: "#1E3A8A",
    tag: "Daily Essential",
    mode: "GROCERY",
    iconText: "🥛",
  },
  {
    id: "britannia-bread-400",
    name: "Britannia 100% Whole Wheat Bread (400g)",
    brand: "Britannia",
    category: "BAKERY",
    originalPrice: 55,
    floorPrice: 30,
    validDays: 3,
    defaultQty: 4,
    description: "Soft sliced whole wheat bread loaf. Ideal for morning toast, sandwiches, and quick healthy snacks.",
    accentColor: "#78350F",
    tag: "High Demand",
    mode: "GROCERY",
    iconText: "🍞",
  },
  {
    id: "fresh-paneer-200",
    name: "Fresh Malai Paneer Block (200g)",
    brand: "Dairy Fresh",
    category: "DAIRY",
    originalPrice: 95,
    floorPrice: 60,
    validDays: 2,
    defaultQty: 5,
    description: "Rich, soft cottage cheese block. High protein content, ready for curries, bhurji, or tikka.",
    accentColor: "#065F46",
    tag: "Top Clearance",
    mode: "GROCERY",
    iconText: "🧀",
  },
  {
    id: "amul-dahi-400",
    name: "Amul Masti Dahi Pouch (400g)",
    brand: "Amul Dairy",
    category: "DAIRY",
    originalPrice: 35,
    floorPrice: 22,
    validDays: 2,
    defaultQty: 8,
    description: "Thick natural set curd prepared from pasteurized toned milk. Chilled and ready to consume.",
    accentColor: "#1E40AF",
    tag: "Fast Mover",
    mode: "GROCERY",
    iconText: "🥣",
  },
  {
    id: "farm-eggs-6",
    name: "Farm Fresh White Eggs (6-Pack Carton)",
    brand: "Farm Fresh",
    category: "MEAT",
    originalPrice: 48,
    floorPrice: 30,
    validDays: 5,
    defaultQty: 6,
    description: "Clean, farm fresh Grade-A eggs packed in secure protective carton. High natural protein.",
    accentColor: "#92400E",
    tag: "Essential",
    mode: "GROCERY",
    iconText: "🥚",
  },
  {
    id: "aashirvaad-atta-5kg",
    name: "Aashirvaad Shudh Chakki Atta (5kg)",
    brand: "Aashirvaad",
    category: "PANTRY",
    originalPrice: 260,
    floorPrice: 195,
    validDays: 14,
    defaultQty: 3,
    description: "100% whole wheat chakki flour with natural dietary fiber. Sealed factory bag.",
    accentColor: "#B45309",
    tag: "Pantry Deal",
    mode: "GROCERY",
    iconText: "🌾",
  },

  // Hotel & Restaurant Surplus Presets
  {
    id: "deluxe-veg-thali",
    name: "Deluxe Veg Thali Surplus Box",
    brand: "Kitchen Partner",
    category: "PREPARED_FOOD",
    originalPrice: 160,
    floorPrice: 80,
    validDays: 0,
    defaultQty: 4,
    description: "Chef-prepared dinner thali: Paneer butter masala, Dal tadka, 3 Tawa rotis, Jeera rice, and Gulab jamun. Hot and hygienically packed.",
    accentColor: "#EA580C",
    tag: "Dinner Special",
    mode: "HOTEL",
    iconText: "🍱",
  },
  {
    id: "chicken-biryani-box",
    name: "Dum Biryani Surplus Box (Chicken)",
    brand: "Royal Kitchen",
    category: "PREPARED_FOOD",
    originalPrice: 240,
    floorPrice: 120,
    validDays: 0,
    defaultQty: 3,
    description: "Aromatic dum biryani cooked with tender chicken pieces, layered basmati rice, served with raita and salan. Fresh kitchen surplus.",
    accentColor: "#B91C1C",
    tag: "Chef Special",
    mode: "HOTEL",
    iconText: "🍗",
  },
  {
    id: "cafe-bakery-box",
    name: "Cafe Artisan Bakery & Pastry Box",
    brand: "Artisan Cafe",
    category: "BAKERY",
    originalPrice: 220,
    floorPrice: 95,
    validDays: 0,
    defaultQty: 3,
    description: "Assorted evening box: 2 Butter croissants, 1 chocolate fudge muffin, and artisanal cookies baked fresh today.",
    accentColor: "#D97706",
    tag: "Closing Special",
    mode: "HOTEL",
    iconText: "🥐",
  },
  {
    id: "sandwich-combo",
    name: "Gourmet Club Sandwich & Crispy Fries",
    brand: "City Bistro",
    category: "PREPARED_FOOD",
    originalPrice: 150,
    floorPrice: 75,
    validDays: 0,
    defaultQty: 4,
    description: "Freshly grilled multi-layered club sandwich with spiced veggies, cheese slice, served with crispy salted fries.",
    accentColor: "#059669",
    tag: "Bistro Surplus",
    mode: "HOTEL",
    iconText: "🥪",
  },
  {
    id: "paneer-gravy-roti",
    name: "Paneer Gravy Combo + 3 Butter Rotis",
    brand: "North Delights",
    category: "PREPARED_FOOD",
    originalPrice: 180,
    floorPrice: 90,
    validDays: 0,
    defaultQty: 4,
    description: "Creamy rich paneer masala curry paired with 3 warm layered butter rotis. Freshly sealed takeaway meal container.",
    accentColor: "#C2410C",
    tag: "Hot Meal",
    mode: "HOTEL",
    iconText: "🍲",
  },
  {
    id: "indo-chinese-bowl",
    name: "Wok Fried Rice & Veg Manchurian Bowl",
    brand: "Wok Express",
    category: "PREPARED_FOOD",
    originalPrice: 160,
    floorPrice: 80,
    validDays: 0,
    defaultQty: 3,
    description: "Wok-tossed vegetable fried rice with crispy vegetable Manchurian balls in rich garlic soya gravy. Hot dinner surplus.",
    accentColor: "#7C3AED",
    tag: "Quick Box",
    mode: "HOTEL",
    iconText: "🥡",
  },
];

export default function AddProductPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [shop, setShop] = useState<ShopWithDescription | null>(null);

  // Quick Preset Shelf State
  const [presetMode, setPresetMode] = useState<"GROCERY" | "HOTEL">("GROCERY");
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [isApplyingPreset, setIsApplyingPreset] = useState(false);

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

  // Live Auto-Sync: Listen for Expo Go Scanner events & URL query params
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const qBarcode = urlParams.get("barcode");
    const qName = urlParams.get("name");
    const qCategory = urlParams.get("category");
    const qPrice = urlParams.get("price");
    const qDesc = urlParams.get("description");

    if (qName) setProductName(qName);
    if (qCategory) setCategory(qCategory as ProductCategory);
    if (qPrice) setOriginalPrice(qPrice);
    if (qDesc) setDescription(qDesc);
    if (qBarcode) {
      setManualBarcode(qBarcode);
      setScanMessage(`Scanned Barcode: ${qBarcode} connected from Expo Go.`);
      toast.success("Phone Scanner Connected", `Loaded details for "${qName || qBarcode}"`);
    }

    const onScannerEvent = (e: any) => {
      const scan = e.detail;
      if (!scan) return;
      if (scan.name) setProductName(scan.name);
      if (scan.category) setCategory(scan.category as ProductCategory);
      if (scan.suggested_price) setOriginalPrice(String(scan.suggested_price));
      if (scan.description) setDescription(scan.description);
      if (scan.barcode) {
        setManualBarcode(scan.barcode);
        setScanMessage(`Live Expo Go Scan Received: ${scan.barcode}`);
        toast.success("Expo Go Scan Auto-filled!", `Loaded "${scan.name || scan.barcode}" directly from phone camera!`);
      }
    };

    window.addEventListener("EXPIRYGO_SCANNER_EVENT", onScannerEvent);
    return () => window.removeEventListener("EXPIRYGO_SCANNER_EVENT", onScannerEvent);
  }, [toast]);
  
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
      toast.warning("Please upload an expiry date image first.");
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
      toast.warning("Please enter a product name first before optimizing.");
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

  const handleSelectPreset = async (preset: PresetItem) => {
    try {
      setIsApplyingPreset(true);
      setSelectedPresetId(preset.id);
      setError("");

      const now = new Date();
      let mfgStr = "";
      let expStr = "";

      if (preset.validDays === 0) {
        // Same-day restaurant surplus (dinner/lunch clearance)
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        mfgStr = yesterday.toISOString().split("T")[0];
        expStr = now.toISOString().split("T")[0];
      } else {
        mfgStr = now.toISOString().split("T")[0];
        const expDate = new Date(now.getTime() + preset.validDays * 24 * 60 * 60 * 1000);
        expStr = expDate.toISOString().split("T")[0];
      }

      setProductName(preset.name);
      setCategory(preset.category);
      setOriginalPrice(preset.originalPrice.toString());
      setAutoDiscountMinPrice(preset.floorPrice.toString());
      setAutoDiscountEnabled(true);
      setQuantity(preset.defaultQty.toString());
      setManufacturingDate(mfgStr);
      setExpiryDate(expStr);
      setDescription(preset.description);

      // Generate branded client-side product assets
      if (typeof window !== "undefined") {
        // 1. Front card canvas
        const canvasF = document.createElement("canvas");
        canvasF.width = 600;
        canvasF.height = 600;
        const ctxF = canvasF.getContext("2d");
        if (ctxF) {
          const grad = ctxF.createLinearGradient(0, 0, 600, 600);
          grad.addColorStop(0, "#0B1120");
          grad.addColorStop(1, preset.accentColor);
          ctxF.fillStyle = grad;
          ctxF.fillRect(0, 0, 600, 600);

          ctxF.beginPath();
          ctxF.arc(300, 300, 210, 0, Math.PI * 2);
          ctxF.fillStyle = "rgba(255, 255, 255, 0.04)";
          ctxF.fill();

          // Header tag
          ctxF.fillStyle = "rgba(255, 255, 255, 0.12)";
          if (ctxF.roundRect) ctxF.roundRect(40, 40, 220, 40, 10);
          else ctxF.fillRect(40, 40, 220, 40);
          ctxF.fill();
          ctxF.fillStyle = "#F8FAFC";
          ctxF.font = "bold 15px sans-serif";
          ctxF.fillText(preset.mode === "GROCERY" ? "🛒 EXPIRYGO MART" : "🍽️ EXPIRYGO FOOD", 55, 65);

          // Verified tag
          ctxF.fillStyle = "rgba(16, 185, 129, 0.25)";
          if (ctxF.roundRect) ctxF.roundRect(380, 40, 180, 40, 10);
          else ctxF.fillRect(380, 40, 180, 40);
          ctxF.fill();
          ctxF.fillStyle = "#10B981";
          ctxF.font = "bold 14px sans-serif";
          ctxF.fillText("✓ VERIFIED RESCUE", 400, 65);

          // Brand
          ctxF.fillStyle = "#94A3B8";
          ctxF.font = "bold 20px sans-serif";
          ctxF.fillText(preset.brand.toUpperCase(), 40, 200);

          // Title
          ctxF.fillStyle = "#FFFFFF";
          ctxF.font = "bold 32px sans-serif";
          const words = preset.name.split(" ");
          let line = "";
          let y = 250;
          for (let n = 0; n < words.length; n++) {
            const test = line + words[n] + " ";
            if (ctxF.measureText(test).width > 500 && n > 0) {
              ctxF.fillText(line, 40, y);
              line = words[n] + " ";
              y += 42;
            } else {
              line = test;
            }
          }
          ctxF.fillText(line, 40, y);

          // MRP & Floor bar
          ctxF.fillStyle = "rgba(0, 0, 0, 0.5)";
          if (ctxF.roundRect) ctxF.roundRect(40, 410, 520, 75, 16);
          else ctxF.fillRect(40, 410, 520, 75);
          ctxF.fill();
          ctxF.fillStyle = "#94A3B8";
          ctxF.font = "bold 16px sans-serif";
          ctxF.fillText(`MRP: ₹${preset.originalPrice}`, 65, 454);
          ctxF.fillStyle = "#34D399";
          ctxF.font = "bold 20px sans-serif";
          ctxF.fillText(`CLEARANCE FLOOR: ₹${preset.floorPrice}`, 260, 454);

          // Footer
          ctxF.fillStyle = "#38BDF8";
          ctxF.font = "bold 15px sans-serif";
          ctxF.fillText("⚡ 1-TAP INVENTORY PRESET  •  VERIFIED STOCK", 40, 545);

          const frontDataUrl = canvasF.toDataURL("image/jpeg", 0.92);
          setFrontImage(frontDataUrl);

          canvasF.toBlob((blob) => {
            if (blob) {
              const file = new File([blob], `${preset.id}_front.jpg`, { type: "image/jpeg" });
              setFrontImageFile(file);
            }
          }, "image/jpeg", 0.92);
        }

        // 2. Expiry stamp canvas
        const canvasE = document.createElement("canvas");
        canvasE.width = 600;
        canvasE.height = 400;
        const ctxE = canvasE.getContext("2d");
        if (ctxE) {
          ctxE.fillStyle = "#0F172A";
          ctxE.fillRect(0, 0, 600, 400);

          ctxE.strokeStyle = "#334155";
          ctxE.lineWidth = 4;
          ctxE.strokeRect(20, 20, 560, 360);

          ctxE.fillStyle = "#64748B";
          ctxE.font = "bold 16px monospace";
          ctxE.fillText("EXPIRYGO QUALITY ASSURANCE & DATE STAMP", 40, 70);

          ctxE.fillStyle = "#E2E8F0";
          ctxE.font = "bold 24px sans-serif";
          ctxE.fillText(preset.name, 40, 130);

          ctxE.fillStyle = "#F87171";
          ctxE.font = "bold 32px monospace";
          ctxE.fillText(`USE BY / EXP: ${expStr}`, 40, 210);

          ctxE.fillStyle = "#10B981";
          ctxE.font = "18px monospace";
          ctxE.fillText("✓ VERIFIED MERCHANT SURPLUS BATCH", 40, 280);

          const expDataUrl = canvasE.toDataURL("image/jpeg", 0.92);
          setExpiryImage(expDataUrl);

          canvasE.toBlob((blob) => {
            if (blob) {
              const file = new File([blob], `${preset.id}_expiry.jpg`, { type: "image/jpeg" });
              setExpiryImageFile(file);
            }
          }, "image/jpeg", 0.92);
        }
      }

      toast.success("Preset Loaded!", `Auto-filled details for "${preset.name}". Adjust quantity or floor price and publish in seconds.`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load preset", "Could not generate preset assets.");
    } finally {
      setIsApplyingPreset(false);
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

      // 2. Create product with computed discount_price
      const origPriceVal = parseFloat(originalPrice);
      const computedDiscount = autoDiscountEnabled && minPriceVal
        ? minPriceVal
        : Math.max(1, Math.round(origPriceVal * 0.7));

      const productData: ApiProductCreate = {
        name: productName.trim(),
        original_price: origPriceVal,
        discount_price: computedDiscount,
        quantity: parseInt(quantity, 10),
        manufacturing_date: manufacturingDate + "T00:00:00",
        expiry_date: expiryDate + "T23:59:59",
        category,
        front_image_url: uploadedFrontUrl,
        expiry_image_url: uploadedExpiryUrl,
        voice_note_url: null,
        description: description.trim() || null,
        is_surprise_bag: false,
        is_active: true,
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

          {/* ⚡ 1-Tap Quick Presets Shelf */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0">
                  <Zap size={22} className="animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-gray-900 dark:text-white">
                      1-Tap Quick Presets
                    </h2>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                      10s Fast Listing
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Tap any common surplus item to instantly populate name, MRP, floor price & images
                  </p>
                </div>
              </div>

              {/* Mode Switcher */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-800/80 p-1 rounded-2xl self-start sm:self-auto border border-gray-200/50 dark:border-gray-700/50">
                <button
                  type="button"
                  onClick={() => setPresetMode("GROCERY")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    presetMode === "GROCERY"
                      ? "bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <ShoppingBag size={14} />
                  <span>🛒 Kirana / Groceries</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPresetMode("HOTEL")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    presetMode === "HOTEL"
                      ? "bg-white dark:bg-gray-900 text-purple-600 dark:text-purple-400 shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <UtensilsCrossed size={14} />
                  <span>🍽️ Hotel / Meals</span>
                </button>
              </div>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {PRESET_ITEMS.filter((p) => p.mode === presetMode).map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                const discountPct = Math.round(((preset.originalPrice - preset.floorPrice) / preset.originalPrice) * 100);

                return (
                  <button
                    key={preset.id}
                    type="button"
                    disabled={isApplyingPreset}
                    onClick={() => handleSelectPreset(preset)}
                    className={`group relative text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-500 dark:border-emerald-500/60 ring-2 ring-emerald-500/30 shadow-md"
                        : "bg-gray-50/50 dark:bg-gray-800/40 border-gray-200/70 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/70"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="text-xl">{preset.iconText}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200/60 dark:border-gray-700/60">
                            {preset.tag}
                          </span>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                              <Check size={12} strokeWidth={3} />
                            </span>
                          )}
                        </div>
                      </div>

                      <h3 className="text-xs font-bold text-gray-900 dark:text-white line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                        {preset.name}
                      </h3>
                      <p className="text-[11px] text-gray-400 font-medium">
                        {preset.brand} &bull; {preset.validDays === 0 ? "Expiring Tonight" : `~${preset.validDays} Days Life`}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-gray-200/50 dark:border-gray-800/80 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-gray-400 line-through mr-1.5">
                          ₹{preset.originalPrice}
                        </span>
                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                          ₹{preset.floorPrice}
                        </span>
                      </div>
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        {discountPct}% OFF
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedPresetId && (
              <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-3.5 py-2 rounded-xl border border-emerald-500/20">
                <span className="flex items-center gap-1.5 font-bold">
                  <Check size={14} /> Preset applied! Images & dates auto-filled.
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedPresetId(null)}
                  className="text-xs font-bold underline hover:opacity-80"
                >
                  Clear Selection
                </button>
              </div>
            )}
          </div>

          {/* Product Info Section */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Plus size={20} className="text-emerald-500" />
                Product Details
              </h2>
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
