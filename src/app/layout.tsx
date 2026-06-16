import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { HydrationZapper } from "@/components/HydrationZapper";
import { AuthenticationProvider } from "@/contexts/AuthenticationContext";

import { LiveDealToast } from "@/components/ui/LiveDealToast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ExpiryGo | Grab it before it's gone.",
  description: "Near-expiry products from local shops at up to 70% off. Save money, fight food waste, shop smarter.",
  keywords: ["deals", "local shops", "food waste", "discounts", "near-expiry"],
  openGraph: {
    title: "ExpiryGo | Grab it before it's gone.",
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
        <meta name="theme-color" content="#10b981" />
      </head>
      <body className={`${inter.className} min-h-screen bg-[#111111] text-white selection:bg-emerald-500/30 overflow-x-hidden relative`} suppressHydrationWarning>
        <HydrationZapper />
        <AuthenticationProvider>
          {children}
          <LiveDealToast />
        </AuthenticationProvider>
      </body>
    </html>
  );
}
