"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldAlert, Scale, CheckSquare, Clock, ShoppingBag } from "lucide-react";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#0F111E] text-white">
      {/* Header */}
      <header className="border-b border-purple-900/40 bg-zinc-950/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition py-2 px-3 bg-white/5 rounded-xl border border-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight text-white">
              Mee<span className="text-purple-400">va</span>
            </span>
            <span className="text-xs text-purple-400 font-mono bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/30">
              Terms of Service
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold mb-4">
            <Scale className="w-3.5 h-3.5" />
            TERMS & USER AGREEMENT
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Terms of Service
          </h1>
          <p className="text-sm text-zinc-400 mt-2">
            Effective: September 2026. Governing surplus food rescue, merchant listings, and customer reservations.
          </p>
        </div>

        <div className="space-y-8 text-sm text-zinc-300 leading-relaxed font-normal">
          <section className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-purple-400" />
              1. Platform Nature & Surplus Food Mission
            </h2>
            <p>
              Meeva acts as a hyper-local technology platform connecting conscious consumers with verified neighbourhood supermarkets, bakeries, and food grocers offering discounted near-expiry or surplus inventory. Meeva facilitates reservations and real-time inventory discovery.
            </p>
          </section>

          <section className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              2. Pickup Timelines & 6-Digit Verification
            </h2>
            <p>
              Due to the perishable nature of surplus items:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-zinc-400 pl-2">
              <li>Shoppers must collect reserved items before the designated shop closing or pickup window.</li>
              <li>Pickup requires presenting your dynamic 6-digit PIN or QR code to the storekeeper at counter checkout.</li>
              <li>Unclaimed items after the pickup window expires may be returned to inventory or donated to local food banks.</li>
            </ul>
          </section>

          <section className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              3. Merchant Quality Standards & Safety
            </h2>
            <p>
              All merchant partners agree to uphold food safety regulations:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-zinc-400 pl-2">
              <li>Items must be wholesome, stored at compliant temperatures, and within acceptable manufacturer quality guidelines.</li>
              <li>Merchants are responsible for accurate expiry dates, batch labeling, and stock counts.</li>
              <li>Failure to maintain safety standards results in immediate store suspension.</li>
            </ul>
          </section>

          <section className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-indigo-400" />
              4. Fair Use & Cancellation Policy
            </h2>
            <p>
              Users may cancel active reservations before the pickup deadline without penalty. Repeated uncollected reservations may temporarily limit reservation limits to ensure fair access for the local community.
            </p>
          </section>
        </div>

        <div className="pt-8 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <p>&copy; {new Date().getFullYear()} Meeva Technologies Inc. All rights reserved.</p>
          <Link href="/sustainability" className="text-purple-400 hover:underline">
            View Sustainability Disclosure &rarr;
          </Link>
        </div>
      </main>
    </div>
  );
}
