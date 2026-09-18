"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Shield, Lock, Eye, FileText, CheckCircle } from "lucide-react";

export default function PrivacyPolicyPage() {
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
              Privacy Policy
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold mb-4">
            <Shield className="w-3.5 h-3.5" />
            GLOBAL DATA PROTECTION & TRANSPARENCY
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Privacy Policy & Data Ethics
          </h1>
          <p className="text-sm text-zinc-400 mt-2">
            Last updated: September 2026. Effective globally for all Meeva shoppers, merchants, and partners.
          </p>
        </div>

        <div className="space-y-8 text-sm text-zinc-300 leading-relaxed font-normal">
          <section className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-purple-400" />
              1. Information We Collect
            </h2>
            <p>
              Meeva collects minimal personal data required to enable seamless hyper-local surplus food rescue. This includes:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-zinc-400 pl-2">
              <li><strong className="text-zinc-200">Account Credentials:</strong> Name, verified email address, phone number (for OTP verification), and encrypted authentication tokens.</li>
              <li><strong className="text-zinc-200">Hyper-Local Geolocation:</strong> Approximate latitude and longitude to calculate walking distance to nearby grocery stores and bakeries. We never track continuous background location without explicit permission.</li>
              <li><strong className="text-zinc-200">Reservation Records:</strong> 6-digit pickup verification tokens, order timestamps, and items saved from landfills.</li>
            </ul>
          </section>

          <section className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-400" />
              2. How We Use Your Data
            </h2>
            <p>
              Your data is exclusively utilized to power core platform capabilities:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-zinc-400 pl-2">
              <li>Facilitating store pickup verifications with shopkeepers via instant QR codes.</li>
              <li>AI-assisted zero-waste recipe cooking suggestions in the Digital Pantry.</li>
              <li>Calculating your personal carbon emission savings (CO₂e) and eco-impact milestones.</li>
              <li>Broadcasting real-time flash markdown alerts for nearby perishable inventory.</li>
            </ul>
          </section>

          <section className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              3. Zero Data Brokering Guarantee
            </h2>
            <p>
              Meeva operates under a strict Zero-Ad-Tracker, Zero-Data-Brokering mandate. We never sell, rent, or trade your personal data, shopping habits, or location history to third-party advertisers.
            </p>
          </section>

          <section className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-pink-400" />
              4. Your Rights & Data Deletion
            </h2>
            <p>
              You maintain full control over your digital footprint. You can export your order history, clear cached location data, or request permanent account deletion anytime from your profile settings or by contacting our team.
            </p>
          </section>
        </div>

        <div className="pt-8 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <p>&copy; {new Date().getFullYear()} Meeva Technologies Inc. All rights reserved.</p>
          <Link href="/terms" className="text-purple-400 hover:underline">
            View Terms of Service &rarr;
          </Link>
        </div>
      </main>
    </div>
  );
}
