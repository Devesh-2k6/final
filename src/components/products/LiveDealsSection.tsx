"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import { getProducts } from "@/services/products";
import type { ApiProduct } from "@/types/product";
import { DealProductCard } from "./DealProductCard";
import { buildDealProductCardProps } from "@/lib/products/map-deal-product";
import { useConfetti } from "@/hooks/useConfetti";
import { useSound } from "@/hooks/useSound";
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
      setProducts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, [activeCategory]);

  const handleReserve = async (id: string, e?: React.MouseEvent) => {
    playPopSound();
    if (e) triggerConfetti(e);
    try {
      await createReservation(id, 1);
      // Remove or update the product after reservation
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
    <section className="max-w-5xl mx-auto px-4 py-24 relative z-10">
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-12">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-emerald-500" />
          <h3 className="text-emerald-500 font-bold text-sm tracking-widest uppercase">Live Deals</h3>
        </div>
        <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">Freshness hunting, made easy</h2>
        <p className="text-gray-400 font-medium text-lg max-w-2xl">Real-time listings from shops in your neighbourhood. Connected directly to local shopkeepers.</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex flex-wrap gap-3 mb-12 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => handleCategoryClick(cat)}
            className={`px-6 py-2.5 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeCategory === cat 
                ? "bg-white text-[#111111] shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                : "bg-[#242424] border border-white/5 text-gray-300 hover:bg-white/10 hover:border-white/20"
            }`}
          >
            {cat === "All" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </motion.div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-emerald-500" size={32} />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 bg-[#1A1A1A] rounded-[2rem] border border-white/5">
          <p className="text-gray-400 font-medium">No live deals found right now. Check back soon!</p>
        </div>
      ) : (
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
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
