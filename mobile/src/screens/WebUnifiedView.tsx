import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  BackHandler,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { WebView } from "react-native-webview";
import { ScanLine, RefreshCw, Smartphone, Camera } from "lucide-react-native";
import { UniversalScannerModal, type ScannedBarcodeResult } from "../components/UniversalScannerModal";
import { broadcastScannerResult } from "../services/products";

const AnyWebView = WebView as any;
const WEB_BASE = "https://expirygo.vercel.app";
const WEB_URL = `${WEB_BASE}?app=true`;

interface WebUnifiedViewProps {
  onSwitchToNative?: () => void;
}

export const WebUnifiedView: React.FC<WebUnifiedViewProps> = ({ onSwitchToNative }) => {
  const webViewRef = useRef<any>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(WEB_URL);

  // Handle hardware Android back button
  useEffect(() => {
    if (Platform.OS === "android") {
      const onBackPress = () => {
        if (canGoBack && webViewRef.current) {
          webViewRef.current.goBack();
          return true;
        }
        return false;
      };
      const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => sub.remove();
    }
  }, [canGoBack]);

  const handleBarcodeScanned = (res: ScannedBarcodeResult) => {
    setScannerVisible(false);
    const code = res.barcode || res.name || "";
    if (!code) return;

    // 1. Broadcast to Web Companion API relay so any open desktop browser on Vercel gets it live
    void broadcastScannerResult(res);

    if (webViewRef.current) {
      // 2. Inject live postMessage into current web page for instant form auto-fill
      const payloadStr = JSON.stringify({
        type: "EXPIRYGO_SCANNER_EVENT",
        barcode: res.barcode,
        code: res.barcode,
        name: res.name,
        category: res.category,
        brand: res.brand,
        suggested_price: res.suggested_price,
        description: res.description,
      });

      const injectScript = `
        try {
          const detail = ${payloadStr};
          window.postMessage(detail, "*");
          window.dispatchEvent(new CustomEvent("EXPIRYGO_SCANNER_EVENT", { detail }));
        } catch(e) {}
        true;
      `;
      webViewRef.current.injectJavaScript(injectScript);

      // 3. If user is on default feed and not specialized tool pages, navigate to deals query
      if (
        !currentUrl.includes("/shop/products/add") &&
        !currentUrl.includes("/scanner") &&
        !currentUrl.includes("/reservations") &&
        !res.is_pickup_verification
      ) {
        const target = `${WEB_BASE}/deals?q=${encodeURIComponent(code)}&app=true`;
        webViewRef.current.injectJavaScript(`window.location.href = "${target}"; true;`);
      }
    }
  };

  const reloadWeb = () => {
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="dark" />

      {/* Top Floating Controls Bar */}
      <View style={styles.topControlBar} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.refreshPill}
          onPress={reloadWeb}
          activeOpacity={0.85}
          accessibilityLabel="Reload Vercel Web Page"
        >
          <RefreshCw size={12} color="#ffffff" />
          <Text style={styles.controlPillText}>Reload</Text>
        </TouchableOpacity>

        {onSwitchToNative && (
          <TouchableOpacity
            style={styles.switchToNativePill}
            onPress={onSwitchToNative}
            activeOpacity={0.88}
          >
            <Smartphone size={13} color="#ffffff" />
            <Text style={styles.controlPillText}>Native Mode</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Main Full-Screen Web App (Hosted on Vercel) */}
      <View style={styles.webWrap}>
        <AnyWebView
          ref={webViewRef}
          source={{ uri: WEB_URL }}
          style={styles.webview}
          onNavigationStateChange={(nav: any) => {
            setCanGoBack(Boolean(nav?.canGoBack));
            setCanGoForward(Boolean(nav?.canGoForward));
            if (nav?.url) setCurrentUrl(nav.url);
          }}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
          allowsBackForwardNavigationGestures={true}
          pullToRefreshEnabled={true}
          sharedCookiesEnabled={true}
          cacheEnabled={true}
          geolocationEnabled={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          renderLoading={() => (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#7c3aed" />
              <Text style={styles.loadingText}>Opening ExpiryGo on Vercel...</Text>
            </View>
          )}
        />
      </View>

      {/* Prominent Floating Center-Bottom Barcode Scanner Dock */}
      <View style={styles.bottomDock} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.floatingScanner}
          activeOpacity={0.88}
          onPress={() => setScannerVisible(true)}
          accessibilityLabel="Launch Camera Barcode Scanner"
        >
          <View style={styles.scannerIconGlow}>
            <ScanLine size={21} color="#ffffff" strokeWidth={2.6} />
          </View>
          <View style={styles.scannerTextWrap}>
            <Text style={styles.scannerBtnTitle}>Scan Product Barcode</Text>
            <Text style={styles.scannerBtnSub}>Expo Go Camera • Live Sync</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Hardware Camera / Barcode Modal */}
      <UniversalScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        initialMode="barcode"
        onBarcodeDetected={handleBarcodeScanned}
        onQrScanned={(qr) => {
          setScannerVisible(false);
          void broadcastScannerResult({
            barcode: qr,
            name: qr.startsWith("http") ? "Web Link: " + qr : "QR Pass: " + qr,
            category: "OTHER",
          });
          if (webViewRef.current) {
            const payloadStr = JSON.stringify({
              type: "EXPIRYGO_SCANNER_EVENT",
              barcode: qr,
              code: qr,
              name: "QR Code: " + qr,
            });
            webViewRef.current.injectJavaScript(`
              try {
                const detail = ${payloadStr};
                window.postMessage(detail, "*");
                window.dispatchEvent(new CustomEvent("EXPIRYGO_SCANNER_EVENT", { detail }));
              } catch(e) {}
              true;
            `);
          }
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFE",
  },
  topControlBar: {
    position: "absolute",
    top: Platform.OS === "ios" ? 48 : 12,
    left: 14,
    right: 14,
    zIndex: 9999,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  refreshPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(109, 40, 217, 0.92)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  switchToNativePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(16, 185, 129, 0.95)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  controlPillText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  webWrap: {
    flex: 1,
    backgroundColor: "#FAFAFE",
  },
  webview: {
    flex: 1,
    backgroundColor: "#FAFAFE",
  },
  loadingOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#FAFAFE",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "#6D28D9",
    fontSize: 14,
    fontWeight: "700",
  },
  bottomDock: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 28 : 18,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9998,
  },
  floatingScanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#7c3aed",
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 36,
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.35)",
  },
  scannerIconGlow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  scannerTextWrap: {
    alignItems: "flex-start",
  },
  scannerBtnTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  scannerBtnSub: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 10,
    fontWeight: "600",
  },
});
