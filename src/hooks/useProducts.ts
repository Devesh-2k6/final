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
      return Array.isArray(data) ? data : [];
    } catch (err) {
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
