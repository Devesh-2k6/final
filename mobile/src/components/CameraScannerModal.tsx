import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import {
  X,
  Camera,
  Image as ImageIcon,
  Sparkles,
  ScanLine,
  QrCode,
  Zap,
} from "lucide-react-native";
import { Colors, Radius, Spacing, Typography } from "../theme";
import { scanProductDatesNative, lookupBarcode } from "../services/products";

export type ScannerMode = "ocr_dates" | "barcode" | "qr_pickup" | "qr_general";

interface CameraScannerModalProps {
  visible: boolean;
  onClose: () => void;
  mode: ScannerMode;
  onDatesDetected?: (dates: { mfg: string | null; expiry: string | null; text: string }) => void;
  onBarcodeDetected?: (data: { barcode: string; name?: string | null; category?: string | null }) => void;
  onQrScanned?: (data: string) => void;
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  visible,
  onClose,
  mode,
  onDatesDetected,
  onBarcodeDetected,
  onQrScanned,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [enableTorch, setEnableTorch] = useState(false);
  const cameraRef = useRef<any>(null);

  if (!visible) return null;

  const handleCapturePhoto = async () => {
    if (!cameraRef.current || isProcessing) return;

    try {
      setIsProcessing(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });

      if (photo?.uri && mode === "ocr_dates") {
        const result = await scanProductDatesNative(photo.uri);
        if (onDatesDetected) {
          onDatesDetected({
            mfg: result.manufacturing_date,
            expiry: result.expiry_date,
            text: result.detected_text,
          });
        }
        onClose();
      }
    } catch (err: any) {
      console.log("Photo capture / scan failed:", err);
      Alert.alert("OCR Error", err.message || "Failed to extract dates from captured photo.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission Required", "Please grant photo gallery permission to select packaging images.");
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });

      if (!res.canceled && res.assets && res.assets[0]?.uri) {
        setIsProcessing(true);
        if (mode === "ocr_dates") {
          const result = await scanProductDatesNative(res.assets[0].uri);
          if (onDatesDetected) {
            onDatesDetected({
              mfg: result.manufacturing_date,
              expiry: result.expiry_date,
              text: result.detected_text,
            });
          }
          onClose();
        }
      }
    } catch (err: any) {
      console.log("Gallery selection failed:", err);
      Alert.alert("Error", err.message || "Failed to load image from gallery.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (!data || isProcessing) return;
    setIsProcessing(true);

    try {
      if (mode.startsWith("qr")) {
        const cleanData = data.replace(/^EXPIRYGO:/i, "").trim();
        if (onQrScanned) {
          onQrScanned(cleanData);
        }
        onClose();
        return;
      } else if (mode === "barcode") {
        try {
          const lookup = await lookupBarcode(data);
          if (onBarcodeDetected) {
            onBarcodeDetected({
              barcode: data,
              name: lookup.name,
              category: lookup.category,
            });
          }
        } catch {
          if (onBarcodeDetected) {
            onBarcodeDetected({ barcode: data });
          }
        }
        onClose();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const getModeTitle = () => {
    switch (mode) {
      case "qr_pickup":
        return "Customer QR Scanner";
      case "qr_general":
        return "QR Code Scanner";
      case "barcode":
        return "Product Barcode Scanner";
      case "ocr_dates":
        return "AI Expiry Date Scanner";
    }
  };

  const getOverlayHint = () => {
    switch (mode) {
      case "qr_pickup":
      case "qr_general":
        return "Point at customer's pickup QR code";
      case "barcode":
        return "Center barcode within the frame";
      case "ocr_dates":
        return "Align EXPIRY / MFG text inside box & tap capture";
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Top Control Bar */}
        <View style={styles.topBar}>
          <View style={styles.titleRow}>
            {mode.startsWith("qr") ? (
              <QrCode size={20} color={Colors.primaryBright} />
            ) : mode === "barcode" ? (
              <ScanLine size={20} color={Colors.primaryBright} />
            ) : (
              <Sparkles size={20} color={Colors.primaryBright} />
            )}
            <Text style={styles.topBarTitle}>{getModeTitle()}</Text>
          </View>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={22} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Camera Viewfinder */}
        {!permission?.granted ? (
          <View style={styles.permissionContainer}>
            <Camera size={48} color={Colors.primaryBright} />
            <Text style={styles.permissionTitle}>Camera Permission Required</Text>
            <Text style={styles.permissionSub}>
              ExpiryGo needs camera access to automatically scan QR codes, product barcodes, and expiry labels.
            </Text>
            <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission} activeOpacity={0.85}>
              <Text style={styles.permissionBtnText}>Grant Camera Access</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cameraWrapper}>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing="back"
              enableTorch={enableTorch}
              barcodeScannerSettings={{
                barcodeTypes: ["qr", "ean13", "ean8", "code128", "code39", "upc_a", "upc_e"],
              }}
              onBarcodeScanned={mode !== "ocr_dates" ? handleBarcodeScanned : undefined}
            />

            {/* Overlay Guideline Box */}
            <View style={styles.overlayArea} pointerEvents="box-none">
              <View
                style={[
                  styles.reticle,
                  mode.startsWith("qr") ? styles.reticleSquare : styles.reticleWide,
                ]}
              >
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />

                {/* Scanning Laser Line */}
                <View style={styles.scanLineAnim} />

                {mode.startsWith("qr") ? (
                  <QrCode size={48} color="rgba(16, 185, 129, 0.4)" />
                ) : (
                  <ScanLine size={48} color="rgba(16, 185, 129, 0.4)" />
                )}
              </View>
              <Text style={styles.overlayHint}>{getOverlayHint()}</Text>
            </View>
          </View>
        )}

        {/* Bottom Actions Bar */}
        <View style={styles.bottomBar}>
          {mode === "ocr_dates" ? (
            <TouchableOpacity
              style={styles.galleryBtn}
              onPress={handlePickFromGallery}
              disabled={isProcessing}
            >
              <ImageIcon size={20} color={Colors.textPrimary} />
              <Text style={styles.galleryBtnText}>Gallery</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.torchBtn}
              onPress={() => setEnableTorch(!enableTorch)}
            >
              <Zap size={20} color={enableTorch ? Colors.amberBright : Colors.textPrimary} />
              <Text style={[styles.galleryBtnText, enableTorch && { color: Colors.amberBright }]}>
                {enableTorch ? "Flash On" : "Flashlight"}
              </Text>
            </TouchableOpacity>
          )}

          {mode === "ocr_dates" && (
            <TouchableOpacity
              style={[styles.shutterBtn, isProcessing && styles.shutterBtnDisabled]}
              onPress={handleCapturePhoto}
              disabled={isProcessing}
              activeOpacity={0.85}
            >
              {isProcessing ? (
                <ActivityIndicator color={Colors.textInverse} />
              ) : (
                <View style={styles.shutterInner} />
              )}
            </TouchableOpacity>
          )}

          <View style={styles.aiTag}>
            <Sparkles size={14} color={Colors.primaryBright} />
            <Text style={styles.aiTagText}>
              {mode.startsWith("qr") ? "Auto-Scan" : "AI Vision"}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 50,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: "rgba(7, 10, 16, 0.95)",
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topBarTitle: {
    ...Typography.title2,
    color: "#FFF",
    fontSize: 17,
  },
  closeBtn: {
    padding: 6,
  },
  cameraWrapper: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlayArea: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  reticle: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    borderRadius: Radius.md,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  reticleSquare: {
    width: 240,
    height: 240,
  },
  reticleWide: {
    width: 280,
    height: 180,
  },
  scanLineAnim: {
    position: "absolute",
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: Colors.primaryBright,
    shadowColor: Colors.primaryBright,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: Colors.primaryBright,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 6,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 6,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 6,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 6,
  },
  overlayHint: {
    ...Typography.caption,
    color: "#FFF",
    marginTop: Spacing.lg,
    backgroundColor: "rgba(7, 10, 16, 0.85)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    fontWeight: "700",
  },
  bottomBar: {
    height: 110,
    backgroundColor: "rgba(7, 10, 16, 0.95)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  galleryBtn: {
    alignItems: "center",
    gap: 4,
  },
  torchBtn: {
    alignItems: "center",
    gap: 4,
  },
  galleryBtnText: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontSize: 11,
    fontWeight: "700",
  },
  shutterBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#FFF",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  shutterBtnDisabled: {
    opacity: 0.6,
  },
  shutterInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primaryBright,
  },
  aiTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    gap: 5,
    borderWidth: 1,
    borderColor: Colors.primaryGlow,
  },
  aiTagText: {
    ...Typography.tag,
    color: Colors.primaryBright,
    fontSize: 10,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
    backgroundColor: Colors.background,
  },
  permissionTitle: {
    ...Typography.title1,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    color: "#FFF",
  },
  permissionSub: {
    ...Typography.body,
    textAlign: "center",
    marginBottom: Spacing.lg,
    color: Colors.textSecondary,
  },
  permissionBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    borderRadius: Radius.sm,
  },
  permissionBtnText: {
    color: Colors.textInverse,
    fontWeight: "800",
  },
});
