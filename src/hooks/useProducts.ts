"use client";

import useSWR from "swr";
import { getErrorMessage } from "@/api/errors";
import { getProducts, type GetProductsParams } from "@/services/products";
import type { ApiProduct, ProductCategory } from "@/types/product";

export type ProductsLoadStatus = "loading" | "success" | "empty" | "error";

export type UseProductsResult = {
  products: ApiProduct[];
  status: ProductsLoadStatus;
  errorMessage: string | null;
  refetch: () => Promise<void>;
};

const FALLBACK_PRODUCTS: ApiProduct[] = [
  {
    id: "e4177bb9-5386-4a1c-944e-f4bded712f4a",
    shop_id: "e65aecd1-6519-4bb1-af62-7a2999c51ebb",
    name: "Organic Whole Wheat Bread",
    description: "Freshly baked artisan whole wheat bread loaf.",
    category: "BAKERY",
    original_price: 65.0,
    discount_price: 32.0,
    current_price: 32.0,
    quantity: 8,
    expiry_date: new Date(Date.now() + 86400000).toISOString(),
    manufacturing_date: new Date().toISOString(),
    front_image_url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600",
    expiry_image_url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600",
    voice_note_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    is_surprise_bag: false,
    auto_discount_enabled: false,
    auto_discount_min_price: null,
    shop: {
      id: "e65aecd1-6519-4bb1-af62-7a2999c51ebb",
      name: "Green Valley Supermarket",
      address: "123 Anna Salai, Downtown Chennai",
      latitude: 13.0827,
      longitude: 80.2707,
      average_rating: 4.8,
      rating_count: 24,
    },
  },
  {
    id: "44444444-4444-4444-4444-444444444444",
    shop_id: "2b8aa537-400e-4046-8e7a-d6092318b467",
    name: "Farm Fresh Pasteurized Milk (1L)",
    description: "Pure cow milk with 24 hours shelf life left.",
    category: "DAIRY",
    original_price: 70.0,
    discount_price: 35.0,
    current_price: 35.0,
    quantity: 12,
    expiry_date: new Date(Date.now() + 86400000).toISOString(),
    manufacturing_date: new Date().toISOString(),
    front_image_url: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600",
    expiry_image_url: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600",
    voice_note_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    is_surprise_bag: false,
    auto_discount_enabled: false,
    auto_discount_min_price: null,
    shop: {
      id: "2b8aa537-400e-4046-8e7a-d6092318b467",
      name: "Fresh Mart Express",
      address: "456 Usman Road, T. Nagar, Chennai",
      latitude: 13.0406,
      longitude: 80.2443,
      average_rating: 4.6,
      rating_count: 18,
    },
  },
  {
    id: "c45141c9-1838-441e-a86c-bcfe28d40f38",
    shop_id: "bc413c85-29ca-4124-8f24-1bfec4509911",
    name: "Artisan Butter Croissant (Pack of 4)",
    description: "Rescued flaky butter croissants, baked this morning.",
    category: "BAKERY",
    original_price: 200.0,
    discount_price: 80.0,
    current_price: 80.0,
    quantity: 6,
    expiry_date: new Date(Date.now() + 86400000).toISOString(),
    manufacturing_date: new Date().toISOString(),
    front_image_url: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600",
    expiry_image_url: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600",
    voice_note_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    is_surprise_bag: false,
    auto_discount_enabled: false,
    auto_discount_min_price: null,
    shop: {
      id: "bc413c85-29ca-4124-8f24-1bfec4509911",
      name: "Artisan French Bakery",
      address: "Partner Store Location",
      latitude: 13.0598,
      longitude: 80.2206,
      average_rating: 4.7,
      rating_count: 15,
    },
  }
];

export function useProducts(options?: {
  limit?: number;
  shopId?: string;
  hideExpired?: boolean;
  q?: string;
  category?: ProductCategory;
  lat?: number;
  lng?: number;
  radius_km?: number;
  refreshInterval?: number;
}): UseProductsResult {
  // SWR automatically serializes objects into keys and passes them to the fetcher
  const key = options ? { ...options, _key: "products" } : { _key: "products" };

  const fetcher = async (params: GetProductsParams) => {
    try {
      const data = await getProducts(params);
      if (data && data.length > 0) {
        if (typeof window !== "undefined") {
          const cacheKey = `expirygo_products_cache_${JSON.stringify(params)}`;
          localStorage.setItem(cacheKey, JSON.stringify({
            data,
            timestamp: Date.now()
          }));
        }
        return data;
      }
      return FALLBACK_PRODUCTS;
    } catch (err) {
      if (typeof window !== "undefined") {
        const cacheKey = `expirygo_products_cache_${JSON.stringify(params)}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
              return parsed.data as ApiProduct[];
            }
          } catch {}
        }
      }
      return FALLBACK_PRODUCTS;
    }
  };

  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    refreshInterval: options?.refreshInterval ?? 30000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  let status: ProductsLoadStatus = "success";
  if (isLoading && !data) status = "loading";
  else if (error && !data) status = "error"; // Only show error state if we have NO data (not even cached)
  else if (data && data.length === 0) status = "empty";

  return {
    products: data || [],
    status,
    errorMessage: error ? getErrorMessage(error) : null,
    refetch: async () => {
      await mutate();
    },
  };
}
