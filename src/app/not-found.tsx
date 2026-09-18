"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Home, Search, Leaf, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FAFAFE] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-500/6 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-500/6 rounded-full blur-[150px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 text-center max-w-md"
      >
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-2.5 mb-10">
          <div className="bg-gradient-to-br from-purple-600 via-indigo-600 to-violet-700 p-2.5 rounded-2xl text-white shadow-md shadow-purple-600/25">
            <Leaf size={22} className="fill-white" />
          </div>
          <span className="text-2xl font-black tracking-tight text-slate-900">
            Mee<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">va</span>
          </span>
        </Link>

        {/* 404 Display */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", bounce: 0.4 }}
          className="relative mb-6"
        >
          <div className="text-[120px] sm:text-[160px] font-black leading-none text-transparent bg-clip-text bg-gradient-to-br from-purple-200 via-indigo-200 to-violet-200 select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-[120px] sm:text-[160px] font-black leading-none text-transparent bg-clip-text bg-gradient-to-br from-purple-600/20 via-indigo-600/20 to-violet-600/20 select-none blur-sm">
              404
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <h1 className="text-2xl font-black text-slate-900 mb-3">Page Not Found</h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            Oops! The page you&apos;re looking for doesn&apos;t exist or has been moved.
            Let&apos;s get you back to rescuing some surplus food! 🌱
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-700 text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-purple-500/25 transition-all"
            >
              <Home size={16} />
              Go Home
            </Link>
            <Link
              href="/deals"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-purple-200 text-purple-700 rounded-xl font-bold text-sm hover:bg-purple-50 transition-all"
            >
              <Search size={16} />
              Browse Deals
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
