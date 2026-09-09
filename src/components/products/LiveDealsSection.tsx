"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Loader2, ArrowRight } from "lucide-react";
import { getProducts } from "@/services/products";
import type { ApiProduct } from "@/types/product";
import { DealProductCard } from "./DealProductCard";
import { buildDealProductCardProps } from "@/lib/products/map-deal-product";
import { useConfetti } from "@/hooks/useConfetti";
import { useSound } from "@/hooks/useSound";
import { useWebSocket } from "@/hooks/useWebSocket";
import { createReservation } from "@/services/reservations";

export default function LiveDealsSection() {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const { triggerConfetti } = useConfetti();
  const { playPopSound } = useSound();

  const fetchDeals = async () => {
    setLoading(true);
    try {
      const data = await getProducts({
        category: activeCategory !== "All" ? activeCategory as any : undefined,
        limit: 6
      });
      setProducts(data || []);
    } catch {
      // Fallback is handled inside getProducts
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, [activeCategory]);

  // Real-time live synchronization via WebSocket
  useWebSocket((msg) => {
    if (msg.type === "new_deal" && msg.product) {
      const newProd = msg.product;
      setProducts((prev) => {
        if (prev.some((p) => p.id === newProd.id)) return prev;
        if (activeCategory !== "All" && newProd.category?.toLowerCase() !== activeCategory.toLowerCase()) return prev;
        return [newProd, ...prev].slice(0, 6);
      });
    } else if (msg.type === "update_deal" && msg.product) {
      const updated = msg.product;
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } else if (msg.type === "delete_deal" && msg.product_id) {
      setProducts((prev) => prev.filter((p) => p.id !== msg.product_id));
      fetchDeals();
    }
  });

  const handleReserve = async (id: string, e?: React.MouseEvent) => {
    playPopSound();
    if (e) triggerConfetti(e);
    try {
      await createReservation(id, 1);
      setProducts(prev => prev.map(p => p.id === id ? { ...p, quantity: p.quantity - 1 } : p));
      alert("Successfully reserved!");
    } catch (err: any) {
      alert("Failed to reserve. Please sign in as a customer.");
    }
  };

  const handleCategoryClick = (cat: string) => {
    playPopSound();
    setActiveCategory(cat);
  };

  const categories = ["All", "bakery", "dairy", "snacks", "produce"];

  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  return (
    <section className="max-w-7xl 2xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={18} className="text-purple-600" />
            <h3 className="text-purple-600 font-black text-xs sm:text-sm tracking-widest uppercase">Live Neighbourhood Deals</h3>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-3 tracking-tight text-slate-900">Freshness hunting, made easy</h2>
          <p className="text-slate-600 font-medium text-base sm:text-lg max-w-2xl">Real-time near-expiry listings from verified shops. Grab them at up to 70% off before they expire.</p>
        </div>
        <Link href="/deals" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-md shadow-purple-600/20 transition active:scale-95 shrink-0 self-start md:self-auto">
          View All Deals ({products.length}) →
        </Link>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex flex-wrap gap-2.5 mb-10 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => handleCategoryClick(cat)}
            className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeCategory === cat 
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/20 scale-105"
                : "bg-white border border-purple-100 text-slate-700 hover:bg-purple-50/70 hover:border-purple-200"
            }`}
          >
            {cat === "All" ? "🔥 All Categories" : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </motion.div>

      {loading ? (
        <div className="flex justify-center items-center py-24">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-purple-600" size={36} />
            <p className="text-sm font-bold text-slate-500">Scanning live supermarket inventory...</p>
          </div>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 px-6 bg-white rounded-3xl border border-purple-100 shadow-sm max-w-2xl mx-auto">
          <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
            🛒
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Clean Slate Active — Zero Test Deals</h3>
          <p className="text-slate-600 font-medium text-sm mb-6 max-w-md mx-auto">
            All past test products were purged! Log in as an approved merchant or Platform Admin to upload fresh real-world products.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/shop/setup" className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs sm:text-sm transition shadow-sm">
              🏪 Add Shop & First Product
            </Link>
            <Link href="/map" className="px-5 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-xl font-bold text-xs sm:text-sm transition border border-purple-200">
              Explore Live Radar Map
            </Link>
          </div>
        </div>
      ) : (
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {products.map((product, i) => (
            <DealProductCard
              key={product.id}
              {...buildDealProductCardProps(
                product,
                i,
                null,
                () => {},
                (id) => handleReserve(id, undefined),
                undefined,
                undefined
              )}
              onReserve={(id) => handleReserve(id, undefined)}
            />
          ))}
        </motion.div>
      )}
    </section>
  );
}
