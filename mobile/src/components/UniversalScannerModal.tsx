import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Vibration,
  TextInput,
  ScrollView,
  Image,
  Dimensions,
  Platform,
} from "react-native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import QRCode from "react-native-qrcode-svg";
import {
  X,
  Camera,
  Image as ImageIcon,
  Sparkles,
  ScanLine,
  QrCode,
  Zap,
  RotateCcw,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Keyboard,
  Play,
  ShoppingBag,
  Package,
} from "lucide-react-native";
import { Colors, Radius, Spacing, Typography, Shadows } from "../theme";
import { scanProductDatesNative, lookupBarcode } from "../services/products";
import { addPantryItem } from "../services/pantry";
import type { ProductCategory } from "../types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const EXPO_GO_TEST_SAMPLES = [
  {
    code: "8901030895431",
    title: "Amul Taaza Homogenised Toned Milk 1L",
    brand: "Amul",
    category: "DAIRY" as ProductCategory,
    desc: "Fresh pasteurized toned milk with 3.0% fat and 8.5% SNF.",
    price: 54,
    image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400",
  },
  {
    code: "8901491101837",
    title: "Britannia 100% Whole Wheat Bread 400g",
    brand: "Britannia",
    category: "BAKERY" as ProductCategory,
    desc: "Wholesome brown bread enriched with vitamins and minerals.",
    price: 45,
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400",
  },
  {
    code: "8901725181222",
    title: "Mother Dairy Classic Dahi 400g",
    brand: "Mother Dairy",
    category: "DAIRY" as ProductCategory,
    desc: "Rich, creamy curd packed with probiotic cultures.",
    price: 35,
    image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400",
  },
];

export type UniversalScannerMode =
  | "barcode"
  | "ocr_dates"
  | "qr_pickup"
  | "qr_general"
  | "fridge_log";

export interface ScannedBarcodeResult {
  barcode: string;
  name?: string | null;
  brand?: string | null;
  category?: ProductCategory | null;
  description?: string | null;
  suggested_price?: number | null;
  image_url?: string | null;
}

export interface ScannedOcrResult {
  mfg: string | null;
  expiry: string | null;
  confidence_score?: number;
  detected_text?: string;
  shelf_life_days?: number;
}

interface UniversalScannerModalProps {
  visible: boolean;
  onClose: () => void;
  initialMode?: UniversalScannerMode;
  onDatesDetected?: (dates: ScannedOcrResult) => void;
  onBarcodeDetected?: (data: ScannedBarcodeResult) => void;
  onQrScanned?: (data: string) => void;
  onNavigateToDealsWithQuery?: (query: string) => void;
  onItemAddedToFridge?: () => void;
}



export const UniversalScannerModal: React.FC<UniversalScannerModalProps> = ({
  visible,
  onClose,
  initialMode = "barcode",
  onDatesDetected,
  onBarcodeDetected,
  onQrScanned,
  onNavigateToDealsWithQuery,
  onItemAddedToFridge,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<UniversalScannerMode>(initialMode);
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [enableTorch, setEnableTorch] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanLocked, setScanLocked] = useState(false);

  // Scanned Results State
  const [scannedBarcode, setScannedBarcode] = useState<ScannedBarcodeResult | null>(null);
  const [scannedOcr, setScannedOcr] = useState<ScannedOcrResult | null>(null);
  const [scannedQrCode, setScannedQrCode] = useState<string | null>(null);

  // Manual input modal
  const [manualInputModalVisible, setManualInputModalVisible] = useState(false);
  const [manualInputValue, setManualInputValue] = useState("");

  // Fridge quick add state
  const [fridgeAdding, setFridgeAdding] = useState(false);
  const [fridgeAddedSuccess, setFridgeAddedSuccess] = useState(false);

  const cameraRef = useRef<any>(null);
  const scanAnim = useRef(new Animated.Value(0)).current;

  // Set mode whenever initialMode changes or modal opens
  useEffect(() => {
    if (visible) {
      setMode(initialMode);
      setScannedBarcode(null);
      setScannedOcr(null);
      setScannedQrCode(null);
      setScanLocked(false);
      setFridgeAddedSuccess(false);
    }
  }, [visible, initialMode]);

  // Continuous laser scanline animation
  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (visible && !scannedBarcode && !scannedOcr && !scannedQrCode) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: 1,
            duration: 2200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(scanAnim, {
            toValue: 0,
            duration: 2200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    }
    return () => {
      animation?.stop();
    };
  }, [visible, scannedBarcode, scannedOcr, scannedQrCode, mode, scanAnim]);

  if (!visible) return null;

  const triggerFeedback = () => {
    try {
      Vibration.vibrate(70);
    } catch {
      // Haptics fallback
    }
  };

  // Handle native barcode/QR scanned from camera
  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    const data = result?.data?.trim();
    if (!data || isProcessing || scanLocked) return;

    setScanLocked(true);
    triggerFeedback();

    if (mode === "qr_pickup" || mode === "qr_general" || data.startsWith("EXPIRYGO:")) {
      const cleanData = data.replace(/^EXPIRYGO:/i, "").trim();
      setScannedQrCode(cleanData);
      if (onQrScanned) {
        onQrScanned(cleanData);
      }
      return;
    }

    // Barcode or Fridge Log Mode
    setIsProcessing(true);
    try {
      let lookupResult: ScannedBarcodeResult = { barcode: data };
      try {
        const lookup = await lookupBarcode(data);
        lookupResult = {
          barcode: data,
          name: lookup.name,
          brand: lookup.brand,
          category: lookup.category,
          description: lookup.description,
        };
      } catch {
        // Fallback to pre-loaded Indian sample if available
        const sampleMatch = EXPO_GO_TEST_SAMPLES.find((s) => s.code === data);
        if (sampleMatch) {
          lookupResult = {
            barcode: data,
            name: sampleMatch.title,
            brand: sampleMatch.brand,
            category: sampleMatch.category,
            description: sampleMatch.desc,
            suggested_price: sampleMatch.price,
            image_url: sampleMatch.image,
          };
        }
      }

      setScannedBarcode(lookupResult);
      if (onBarcodeDetected) {
        onBarcodeDetected(lookupResult);
      }

      if (mode === "fridge_log" && lookupResult.name) {
        await handleQuickAddToFridge(lookupResult);
      }
    } catch (err: any) {
      console.log("Barcode lookup error:", err);
      setScannedBarcode({ barcode: data });
    } finally {
      setIsProcessing(false);
    }
  };

  // OCR Photo Capture
  const handleCapturePhoto = async () => {
    if (!cameraRef.current || isProcessing) return;

    try {
      setIsProcessing(true);
      triggerFeedback();
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });

      if (photo?.uri) {
        const result = await scanProductDatesNative(photo.uri);
        const ocrData: ScannedOcrResult = {
          mfg: result.manufacturing_date,
          expiry: result.expiry_date,
          confidence_score: result.confidence_score,
          detected_text: result.detected_text,
        };
        setScannedOcr(ocrData);
        if (onDatesDetected) {
          onDatesDetected(ocrData);
        }
      }
    } catch (err: any) {
      console.log("OCR capture error:", err);
      Alert.alert("OCR Scan", err.message || "Failed to analyze dates from captured photo.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Pick packaging image from device gallery
  const handlePickFromGallery = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission Required", "Please grant photo library access to select product images.");
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.85,
      });

      if (!res.canceled && res.assets && res.assets[0]?.uri) {
        setIsProcessing(true);
        triggerFeedback();
        const result = await scanProductDatesNative(res.assets[0].uri);
        const ocrData: ScannedOcrResult = {
          mfg: result.manufacturing_date,
          expiry: result.expiry_date,
          confidence_score: result.confidence_score,
          detected_text: result.detected_text,
        };
        setScannedOcr(ocrData);
        if (onDatesDetected) {
          onDatesDetected(ocrData);
        }
      }
    } catch (err: any) {
      console.log("Gallery OCR error:", err);
      Alert.alert("Gallery Error", err.message || "Failed to analyze image.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Quick add scanned item to Digital Fridge
  const handleQuickAddToFridge = async (item: ScannedBarcodeResult) => {
    setFridgeAdding(true);
    try {
      const days = 4;
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + days);

      await addPantryItem({
        name: item.name || `Item (${item.barcode})`,
        category: item.category || ("DAIRY" as ProductCategory),
        quantity: "1 unit",
        expiry_date: expDate.toISOString(),
      });

      setFridgeAddedSuccess(true);
      if (onItemAddedToFridge) {
        onItemAddedToFridge();
      }
    } catch (err: any) {
      console.log("Failed to add to fridge:", err);
      Alert.alert("Fridge", err.message || "Failed to add scanned item to fridge.");
    } finally {
      setFridgeAdding(false);
    }
  };

  // Manual code entry submit
  const handleManualSubmit = () => {
    const val = manualInputValue.trim();
    if (!val) return;
    setManualInputModalVisible(false);
    setManualInputValue("");
    handleBarcodeScanned({ data: val, type: "qr" } as any);
  };

  // Reset scanner to scan another item
  const handleResetScanner = () => {
    setScannedBarcode(null);
    setScannedOcr(null);
    setScannedQrCode(null);
    setScanLocked(false);
    setFridgeAddedSuccess(false);
  };

  const getModeTitle = () => {
    switch (mode) {
      case "barcode":
        return "Barcode Scanner";
      case "ocr_dates":
        return "AI Expiry Date OCR";
      case "qr_pickup":
        return "Pickup QR Scanner";
      case "fridge_log":
        return "Fridge Quick-Scan";
      default:
        return "Smart Scanner";
    }
  };

  const getOverlayHint = () => {
    switch (mode) {
      case "barcode":
        return "Point at EAN / UPC product barcode";
      case "ocr_dates":
        return "Align EXPIRY / MFG date inside box & tap shutter";
      case "qr_pickup":
        return "Scan customer's pickup QR code";
      case "fridge_log":
        return "Scan groceries to auto-add to Fridge";
      default:
        return "Center barcode or QR in the frame";
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Top Header Controls */}
        <View style={styles.topBar}>
          <View style={styles.titleRow}>
            <View style={styles.modeIconCircle}>
              {mode === "ocr_dates" ? (
                <Sparkles size={18} color={Colors.primary} />
              ) : mode.startsWith("qr") ? (
                <QrCode size={18} color={Colors.primary} />
              ) : (
                <ScanLine size={18} color={Colors.primary} />
              )}
            </View>
            <View>
              <Text style={styles.topBarTitle}>{getModeTitle()}</Text>
              <Text style={styles.topBarSub}>Expo Go Real-Time Scanner</Text>
            </View>
          </View>

          <View style={styles.topActions}>
            <TouchableOpacity
              style={styles.circleBtn}
              onPress={() => setManualInputModalVisible(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Keyboard size={18} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Mode Switcher Tabs */}
        <View style={styles.modeTabs}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modeTabsContent}>
            <TouchableOpacity
              style={[styles.modeTab, mode === "barcode" && styles.modeTabActive]}
              onPress={() => {
                setMode("barcode");
                handleResetScanner();
              }}
            >
              <ScanLine size={14} color={mode === "barcode" ? "#FFF" : Colors.textMuted} />
              <Text style={[styles.modeTabText, mode === "barcode" && styles.modeTabTextActive]}>Barcode</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeTab, mode === "ocr_dates" && styles.modeTabActive]}
              onPress={() => {
                setMode("ocr_dates");
                handleResetScanner();
              }}
            >
              <Sparkles size={14} color={mode === "ocr_dates" ? "#FFF" : Colors.textMuted} />
              <Text style={[styles.modeTabText, mode === "ocr_dates" && styles.modeTabTextActive]}>AI Expiry Date</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeTab, mode === "qr_pickup" && styles.modeTabActive]}
              onPress={() => {
                setMode("qr_pickup");
                handleResetScanner();
              }}
            >
              <QrCode size={14} color={mode === "qr_pickup" ? "#FFF" : Colors.textMuted} />
              <Text style={[styles.modeTabText, mode === "qr_pickup" && styles.modeTabTextActive]}>Pickup QR</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeTab, mode === "fridge_log" && styles.modeTabActive]}
              onPress={() => {
                setMode("fridge_log");
                handleResetScanner();
              }}
            >
              <Package size={14} color={mode === "fridge_log" ? "#FFF" : Colors.textMuted} />
              <Text style={[styles.modeTabText, mode === "fridge_log" && styles.modeTabTextActive]}>Fridge Scan</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Viewfinder or Permission Required View */}
        {!permission?.granted ? (
          /* Camera Permission Required View */
          <View style={styles.permissionContainer}>
            <View style={styles.permissionIconWrap}>
              <Camera size={44} color={Colors.primary} />
            </View>
            <Text style={styles.permissionTitle}>Camera Access Required</Text>
            <Text style={styles.permissionSub}>
              ExpiryGo uses your camera in Expo Go to scan barcodes, verify pickup QR codes, and extract expiry dates with AI vision.
            </Text>
            <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission} activeOpacity={0.85}>
              <Text style={styles.permissionBtnText}>Enable Camera in Expo Go</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.permissionFallbackBtn}
              onPress={() => setManualInputModalVisible(true)}
              activeOpacity={0.85}
            >
              <ScanLine size={16} color={Colors.primary} />
              <Text style={styles.permissionFallbackText}>Or Enter Code Manually</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Live Camera Viewfinder */
          <View style={styles.cameraWrapper}>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={facing}
              enableTorch={enableTorch}
              barcodeScannerSettings={{
                barcodeTypes: ["qr", "ean13", "ean8", "code128", "code39", "upc_a", "upc_e"],
              }}
              onBarcodeScanned={mode !== "ocr_dates" && !scanLocked ? handleBarcodeScanned : undefined}
            />

            {/* Viewfinder Reticle Overlay */}
            <View style={styles.overlayArea} pointerEvents="box-none">
              <View
                style={[
                  styles.reticle,
                  mode === "qr_pickup" || mode === "qr_general" ? styles.reticleSquare : styles.reticleWide,
                  scanLocked && styles.reticleLocked,
                ]}
              >
                {/* Corner Targets */}
                <View style={[styles.corner, styles.topLeft, scanLocked && styles.cornerLocked]} />
                <View style={[styles.corner, styles.topRight, scanLocked && styles.cornerLocked]} />
                <View style={[styles.corner, styles.bottomLeft, scanLocked && styles.cornerLocked]} />
                <View style={[styles.corner, styles.bottomRight, scanLocked && styles.cornerLocked]} />

                {/* Animated Scanning Laser Line */}
                {!scanLocked && (
                  <Animated.View
                    style={[
                      styles.scanLineAnim,
                      {
                        transform: [
                          {
                            translateY: scanAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [-70, 70],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                )}

                {/* Center Reticle Watermark */}
                {scanLocked ? (
                  <CheckCircle2 size={48} color={Colors.success} />
                ) : mode.startsWith("qr") ? (
                  <QrCode size={44} color="rgba(255, 91, 38, 0.35)" />
                ) : (
                  <ScanLine size={44} color="rgba(255, 91, 38, 0.35)" />
                )}
              </View>

              <Text style={styles.overlayHint}>{getOverlayHint()}</Text>
            </View>
          </View>
        )}

        {/* Scanned Result Bottom Sheet */}
        {(scannedBarcode || scannedOcr || scannedQrCode) && (
          <View style={styles.resultSheet}>
            <View style={styles.resultSheetHeader}>
              <View style={styles.resultHeaderLeft}>
                <CheckCircle2 size={20} color={Colors.success} />
                <Text style={styles.resultSheetTitle}>
                  {scannedOcr ? "AI Dates Detected" : scannedQrCode ? "QR Code Verified" : "Product Recognized"}
                </Text>
              </View>
              <TouchableOpacity onPress={handleResetScanner} style={styles.resultResetBtn}>
                <RotateCcw size={16} color={Colors.primary} />
                <Text style={styles.resultResetText}>Scan Next</Text>
              </TouchableOpacity>
            </View>

            {/* Product Barcode Result */}
            {scannedBarcode && (
              <View style={styles.resultCard}>
                {scannedBarcode.image_url ? (
                  <Image source={{ uri: scannedBarcode.image_url }} style={styles.productThumb} />
                ) : (
                  <View style={styles.productThumbPlaceholder}>
                    <ShoppingBag size={24} color={Colors.textMuted} />
                  </View>
                )}
                <View style={styles.productMeta}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {scannedBarcode.name || `Barcode: ${scannedBarcode.barcode}`}
                  </Text>
                  {scannedBarcode.brand && (
                    <Text style={styles.productBrand}>Brand: {scannedBarcode.brand}</Text>
                  )}
                  {scannedBarcode.category && (
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{scannedBarcode.category}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* AI OCR Result */}
            {scannedOcr && (
              <View style={styles.ocrResultBox}>
                <View style={styles.ocrRow}>
                  <Text style={styles.ocrLabel}>Expiry Date:</Text>
                  <Text style={styles.ocrValue}>{scannedOcr.expiry || "Not clearly visible"}</Text>
                </View>
                {scannedOcr.mfg && (
                  <View style={styles.ocrRow}>
                    <Text style={styles.ocrLabel}>Mfg Date:</Text>
                    <Text style={styles.ocrValue}>{scannedOcr.mfg}</Text>
                  </View>
                )}
                {scannedOcr.confidence_score ? (
                  <View style={styles.ocrConfidenceRow}>
                    <Sparkles size={14} color={Colors.primary} />
                    <Text style={styles.ocrConfidenceText}>
                      AI Confidence: {Math.round(scannedOcr.confidence_score * 100)}%
                    </Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* QR Code Result */}
            {scannedQrCode && (
              <View style={styles.qrResultBox}>
                <Text style={styles.qrLabel}>Scanned Token / Order ID:</Text>
                <Text style={styles.qrValue}>{scannedQrCode}</Text>
              </View>
            )}

            {/* Result Action Buttons */}
            <View style={styles.resultActions}>
              {scannedBarcode?.name && onNavigateToDealsWithQuery && (
                <TouchableOpacity
                  style={styles.actionBtnPrimary}
                  onPress={() => {
                    onClose();
                    onNavigateToDealsWithQuery(scannedBarcode.name!);
                  }}
                  activeOpacity={0.85}
                >
                  <Search size={16} color="#FFF" />
                  <Text style={styles.actionBtnPrimaryText}>Search Deals</Text>
                </TouchableOpacity>
              )}

              {scannedBarcode && (
                <TouchableOpacity
                  style={[styles.actionBtnSecondary, fridgeAddedSuccess && styles.actionBtnSuccess]}
                  onPress={() => handleQuickAddToFridge(scannedBarcode)}
                  disabled={fridgeAdding || fridgeAddedSuccess}
                  activeOpacity={0.85}
                >
                  {fridgeAdding ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : fridgeAddedSuccess ? (
                    <>
                      <CheckCircle2 size={16} color="#FFF" />
                      <Text style={styles.actionBtnSuccessText}>Added to Fridge!</Text>
                    </>
                  ) : (
                    <>
                      <Package size={16} color={Colors.textPrimary} />
                      <Text style={styles.actionBtnSecondaryText}>Add to Fridge</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.actionBtnClose}
                onPress={onClose}
                activeOpacity={0.85}
              >
                <Text style={styles.actionBtnCloseText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Bottom Viewfinder Toolbar (Flashlight, Camera Switch, OCR Gallery) */}
        {!scannedBarcode && !scannedOcr && !scannedQrCode && (
          <View style={styles.bottomBar}>
            {/* Gallery Image Picker */}
            <TouchableOpacity
              style={styles.toolBtn}
              onPress={handlePickFromGallery}
              disabled={isProcessing}
            >
              <ImageIcon size={22} color="#FFF" />
              <Text style={styles.toolBtnText}>Gallery</Text>
            </TouchableOpacity>

            {/* Shutter Button for OCR Date Vision */}
            {mode === "ocr_dates" ? (
              <TouchableOpacity
                style={[styles.shutterBtn, isProcessing && styles.shutterBtnDisabled]}
                onPress={handleCapturePhoto}
                disabled={isProcessing}
                activeOpacity={0.85}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <View style={styles.shutterInner} />
                )}
              </TouchableOpacity>
            ) : (
              /* Torch / Flashlight Toggle */
              <TouchableOpacity
                style={[styles.torchCircleBtn, enableTorch && styles.torchCircleBtnActive]}
                onPress={() => setEnableTorch(!enableTorch)}
                activeOpacity={0.85}
              >
                <Zap size={24} color={enableTorch ? "#FFF" : Colors.amberBright} />
              </TouchableOpacity>
            )}

            {/* Flip Camera (Back/Front) */}
            <TouchableOpacity
              style={styles.toolBtn}
              onPress={() => setFacing(facing === "back" ? "front" : "back")}
            >
              <RotateCcw size={22} color="#FFF" />
              <Text style={styles.toolBtnText}>Flip</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Manual Barcode / Code Input Modal */}
        <Modal
          visible={manualInputModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setManualInputModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.manualModalCard}>
              <View style={styles.manualModalHeader}>
                <Text style={styles.manualModalTitle}>Manual Code Entry</Text>
                <TouchableOpacity onPress={() => setManualInputModalVisible(false)}>
                  <X size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.manualModalDesc}>
                Enter or paste a barcode number or pickup order token to test:
              </Text>

              <TextInput
                style={styles.manualInput}
                placeholder="e.g. 8901234567890 or EXPIRYGO:ORD-101"
                placeholderTextColor={Colors.textMuted}
                value={manualInputValue}
                onChangeText={setManualInputValue}
                autoCapitalize="characters"
                autoFocus
              />

              <View style={styles.manualModalActions}>
                <TouchableOpacity
                  style={styles.manualCancelBtn}
                  onPress={() => setManualInputModalVisible(false)}
                >
                  <Text style={styles.manualCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.manualSubmitBtn}
                  onPress={handleManualSubmit}
                >
                  <Text style={styles.manualSubmitBtnText}>Submit Code</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070A10",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 54 : 44,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: "rgba(10, 15, 26, 0.95)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  modeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  topBarSub: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: "500",
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  modeTabs: {
    backgroundColor: "rgba(10, 15, 26, 0.95)",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  modeTabsContent: {
    paddingHorizontal: Spacing.md,
    gap: 8,
  },
  modeTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  modeTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  modeTabActiveDemo: {
    backgroundColor: "rgba(245, 158, 11, 0.25)",
    borderColor: Colors.amberBright,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textMuted,
  },
  modeTabTextActive: {
    color: "#FFFFFF",
  },
  cameraWrapper: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlayArea: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  reticle: {
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: Radius.lg,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  reticleSquare: {
    width: 250,
    height: 250,
  },
  reticleWide: {
    width: SCREEN_WIDTH * 0.78,
    height: 190,
  },
  reticleLocked: {
    borderColor: Colors.success,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  scanLineAnim: {
    position: "absolute",
    left: 12,
    right: 12,
    height: 3,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  corner: {
    position: "absolute",
    width: 26,
    height: 26,
    borderColor: Colors.primary,
  },
  cornerLocked: {
    borderColor: Colors.success,
  },
  topLeft: {
    top: -3,
    left: -3,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: -3,
    right: -3,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: -3,
    left: -3,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: -3,
    right: -3,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  overlayHint: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: Spacing.xl,
    backgroundColor: "rgba(10, 15, 26, 0.88)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    overflow: "hidden",
  },
  bottomBar: {
    height: 110,
    backgroundColor: "rgba(10, 15, 26, 0.95)",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  toolBtn: {
    alignItems: "center",
    gap: 4,
    minWidth: 60,
  },
  toolBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  torchCircleBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(245, 158, 11, 0.4)",
  },
  torchCircleBtnActive: {
    backgroundColor: Colors.amber,
    borderColor: Colors.amberBright,
  },
  shutterBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#FFFFFF",
    ...Shadows.hover,
  },
  shutterBtnDisabled: {
    opacity: 0.6,
  },
  shutterInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primaryBright,
  },
  resultSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    paddingBottom: Platform.OS === "ios" ? 36 : 20,
    ...Shadows.card,
  },
  resultSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  resultHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  resultSheetTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  resultResetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  resultResetText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
  },
  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.cardSurface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  productThumb: {
    width: 60,
    height: 60,
    borderRadius: Radius.sm,
  },
  productThumbPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: Radius.sm,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  productMeta: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  productBrand: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.primary,
  },
  ocrResultBox: {
    backgroundColor: Colors.cardSurface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  ocrRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ocrLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  ocrValue: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  ocrConfidenceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  ocrConfidenceText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
  },
  qrResultBox: {
    backgroundColor: Colors.cardSurface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 4,
  },
  qrLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textMuted,
    textTransform: "uppercase",
  },
  qrValue: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.primary,
  },
  resultActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: Spacing.md,
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: Radius.sm,
    gap: 6,
  },
  actionBtnPrimaryText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingVertical: 12,
    borderRadius: Radius.sm,
    gap: 6,
  },
  actionBtnSecondaryText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  actionBtnSuccess: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  actionBtnSuccessText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  actionBtnClose: {
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.cardSurface,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  actionBtnCloseText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  permissionIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  permissionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: "center",
  },
  permissionSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: Spacing.xl,
  },
  permissionBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    borderRadius: Radius.sm,
    width: "100%",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  permissionBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  permissionFallbackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  permissionFallbackText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  manualModalCard: {
    width: "100%",
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadows.card,
  },
  manualModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  manualModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textPrimary,
    flex: 1,
  },
  manualModalDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  manualInput: {
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  manualModalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  manualCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.xs,
  },
  manualCancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  manualSubmitBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: Radius.xs,
    alignItems: "center",
  },
  manualSubmitBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
