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
      // Cache only genuine, non-empty results for offline resilience.
      if (data && data.length > 0 && typeof window !== "undefined") {
        const cacheKey = `expirygo_products_cache_${JSON.stringify(params)}`;
        localStorage.setItem(
          cacheKey,
          JSON.stringify({ data, timestamp: Date.now() })
        );
      }
      // Return the real result as-is — an empty list surfaces the honest "empty"
      // state instead of fabricated products that 404 on reserve/order/edit.
      return data ?? [];
    } catch (err) {
      // On failure fall back ONLY to a recent real cache; never to synthetic data.
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
      // No fresh cache -> propagate so the UI can show a real error state.
      throw err;
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
