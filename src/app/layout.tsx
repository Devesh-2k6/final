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

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Meeva | Surplus Food & Grocery Rescue",
  description: "Rescue surplus near-expiry products from local shops at up to 70% off. Save money, fight food waste, shop smarter.",
  keywords: ["deals", "local shops", "food waste", "discounts", "near-expiry", "surplus"],
  openGraph: {
    title: "Meeva | Surplus Food & Grocery Rescue",
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
      </head>
      <body className={`${inter.className} min-h-screen bg-[#FAFAFE] text-slate-900 selection:bg-purple-500/25 overflow-x-hidden relative`} suppressHydrationWarning>
        <HydrationZapper />
        <AppInitializer />
        <LanguageProvider>
          <AuthenticationProvider>
            <EmailVerificationBanner />
            {children}
            <LiveDealToast />
            <MobileAppFloatingButton />
          </AuthenticationProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
