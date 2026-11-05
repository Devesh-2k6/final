import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { HydrationZapper } from "@/components/HydrationZapper";
import { AppInitializer } from "@/components/AppInitializer";
import { AuthenticationProvider } from "@/contexts/AuthenticationContext";
import { LanguageProvider } from "@/contexts/LanguageContext";

import { LiveDealToast } from "@/components/ui/LiveDealToast";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { MobileAppFloatingButton } from "@/components/ui/MobileAppFloatingButton";
import { ToastProvider } from "@/components/ui/Toast";
import { RouteProgressBar } from "@/components/ui/RouteProgressBar";
import { CompanionScannerListener } from "@/components/CompanionScannerListener";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "ExpiryGo | Surplus Food & Grocery Rescue",
  description: "Rescue surplus near-expiry products from local shops at up to 70% off. Save money, fight food waste, shop smarter.",
  keywords: ["deals", "local shops", "food waste", "discounts", "near-expiry", "surplus"],
  openGraph: {
    title: "ExpiryGo | Surplus Food & Grocery Rescue",
    description: "Near-expiry products from local shops at up to 70% off.",
    type: "website",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#7C3AED" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
        <meta httpEquiv="Permissions-Policy" content="camera=*, geolocation=*, microphone=*, clipboard-read=*, clipboard-write=*, display-capture=*" />
        {/* Official Google Identity Services SDK for native Account Chooser popup (like Zomato) */}
        <script src="https://accounts.google.com/gsi/client" async defer></script>
      </head>
      <body className={`${inter.className} min-h-screen bg-[#FAFAFE] text-slate-900 selection:bg-purple-500/25 overflow-x-hidden relative`} suppressHydrationWarning>
        <HydrationZapper />
        <AppInitializer />
        <RouteProgressBar />
        <ToastProvider>
          <LanguageProvider>
            <AuthenticationProvider>
              <EmailVerificationBanner />
              {children}
              <LiveDealToast />
              <CompanionScannerListener />
              <MobileAppFloatingButton />
            </AuthenticationProvider>
          </LanguageProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
