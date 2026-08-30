import React from "react";
import {
  UniversalScannerModal,
  type UniversalScannerMode,
  type ScannedBarcodeResult,
  type ScannedOcrResult,
} from "./UniversalScannerModal";

export type ScannerMode = "ocr_dates" | "barcode" | "qr_pickup" | "qr_general" | "fridge_log" | "demo_test";

interface CameraScannerModalProps {
  visible: boolean;
  onClose: () => void;
  mode: ScannerMode;
  onDatesDetected?: (dates: { mfg: string | null; expiry: string | null; text: string }) => void;
  onBarcodeDetected?: (data: { barcode: string; name?: string | null; category?: string | null }) => void;
  onQrScanned?: (data: string) => void;
  onNavigateToDealsWithQuery?: (query: string) => void;
  onItemAddedToFridge?: () => void;
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  visible,
  onClose,
  mode,
  onDatesDetected,
  onBarcodeDetected,
  onQrScanned,
  onNavigateToDealsWithQuery,
  onItemAddedToFridge,
}) => {
  return (
    <UniversalScannerModal
      visible={visible}
      onClose={onClose}
      initialMode={mode as UniversalScannerMode}
      onDatesDetected={(ocrData: ScannedOcrResult) => {
        if (onDatesDetected) {
          onDatesDetected({
            mfg: ocrData.mfg,
            expiry: ocrData.expiry,
            text: ocrData.detected_text || "",
          });
        }
      }}
      onBarcodeDetected={(barcodeData: ScannedBarcodeResult) => {
        if (onBarcodeDetected) {
          onBarcodeDetected({
            barcode: barcodeData.barcode,
            name: barcodeData.name,
            category: barcodeData.category,
          });
        }
      }}
      onQrScanned={onQrScanned}
      onNavigateToDealsWithQuery={onNavigateToDealsWithQuery}
      onItemAddedToFridge={onItemAddedToFridge}
    />
  );
};
