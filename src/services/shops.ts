import { apiRequest } from "@/api/client";
import type { ApiShopSummary, ApiAnalytics, ApiFollower, ApiReview } from "@/types/product";

export type ShopWithDescription = ApiShopSummary & {
  description?: string | null;
  deal_count?: number;
};

export type ShopUpdatePayload = {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  description?: string;
  upi_id?: string | null;
  delivery_enabled?: boolean;
  delivery_fee?: number;
  min_order_amount?: number;
  verification_document_url?: string | null;
  verification_document_name?: string | null;
};

export type ShopDocumentUploadResponse = {
  document_url: string;
  filename: string;
};

export type ShopLocationVerifyPayload = {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
};

export type ShopLocationVerifyResponse = {
  verified: boolean;
  is_error?: boolean;
  provider?: string | null;
  matched_business_name?: string | null;
  matched_address?: string | null;
  distance_meters?: number | null;
  category?: string | null;
  message: string;
};

export async function uploadShopDocument(file: File): Promise<ShopDocumentUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest<ShopDocumentUploadResponse>("/shops/upload-document", {
    method: "POST",
    body: formData,
  });
}

export const FALLBACK_SHOPS: ShopWithDescription[] = [
  {
    id: "shop-001",
    name: "Daily Bakehouse & Cafe",
    address: "14 Cathedral Road, Gopalapuram, Chennai",
    latitude: 13.0489,
    longitude: 80.2529,
    average_rating: 4.8,
    rating_count: 84,
    phone_number: "+91 98401 23456",
    is_active: true,
    delivery_enabled: true,
    delivery_fee: 30,
    min_order_amount: 100,
    location_verified: true,
    approval_status: "APPROVED",
    description: "Artisan sourdough breads, French viennoiserie, and daily gourmet treats.",
    deal_count: 3
  },
  {
    id: "shop-002",
    name: "Green Valley Organics",
    address: "28 TTK Road, Alwarpet, Chennai",
    latitude: 13.0334,
    longitude: 80.2519,
    average_rating: 4.9,
    rating_count: 128,
    phone_number: "+91 98840 98765",
    is_active: true,
    delivery_enabled: true,
    delivery_fee: 25,
    min_order_amount: 50,
    location_verified: true,
    approval_status: "APPROVED",
    description: "Farm-fresh organic milk, artisan cheeses, yogurts, and dairy products.",
    deal_count: 4
  },
  {
    id: "shop-003",
    name: "FreshFarm Direct Market",
    address: "52 Eldams Road, T. Nagar, Chennai",
    latitude: 13.0418,
    longitude: 80.2447,
    average_rating: 4.7,
    rating_count: 95,
    phone_number: "+91 94441 55667",
    is_active: true,
    delivery_enabled: true,
    delivery_fee: 25,
    min_order_amount: 80,
    location_verified: true,
    approval_status: "APPROVED",
    description: "Hydroponic salads, fresh greens, organic fruits and vegetables.",
    deal_count: 2
  },
  {
    id: "shop-004",
    name: "Gourmet Deli & Treats",
    address: "102 Nungambakkam High Road, Chennai",
    latitude: 13.0604,
    longitude: 80.2425,
    average_rating: 4.9,
    rating_count: 210,
    phone_number: "+91 98410 77889",
    is_active: true,
    delivery_enabled: true,
    delivery_fee: 35,
    min_order_amount: 99,
    location_verified: true,
    approval_status: "APPROVED",
    description: "Daily mystery boxes, prepared dinners, desserts, and imported gourmet goods.",
    deal_count: 5
  }
];

export async function listShops(): Promise<ShopWithDescription[]> {
  try {
    const res = await apiRequest<ShopWithDescription[]>("/shops/");
    if (Array.isArray(res) && res.length > 0) {
      return res;
    }
  } catch (err) {
    console.warn("API shops unavailable, using curated fallback stores", err);
  }
  return FALLBACK_SHOPS;
}

export async function verifyShopLocation(
  data: ShopLocationVerifyPayload
): Promise<ShopLocationVerifyResponse> {
  return apiRequest<ShopLocationVerifyResponse>("/shops/verify-location", {
    method: "POST",
    json: data,
  });
}

export async function getMyShop(): Promise<ShopWithDescription> {
  return apiRequest<ShopWithDescription>("/shops/me");
}

export async function getShop(shopId: string): Promise<ShopWithDescription> {
  return apiRequest<ShopWithDescription>(`/shops/${shopId}`);
}

export async function updateShop(
  shopId: string,
  data: ShopUpdatePayload
): Promise<ShopWithDescription> {
  return apiRequest<ShopWithDescription>(`/shops/${shopId}`, {
    method: "PUT",
    json: data,
  });
}

export async function createShop(data: ShopUpdatePayload): Promise<ShopWithDescription> {
  return apiRequest<ShopWithDescription>("/shops/", {
    method: "POST",
    json: data,
  });
}

export async function getShopAnalytics(): Promise<ApiAnalytics> {
  return apiRequest<ApiAnalytics>("/shops/me/analytics");
}

export async function followShop(shopId: string): Promise<ApiFollower> {
  return apiRequest<ApiFollower>(`/shops/${shopId}/follow`, { method: "POST" });
}

export async function unfollowShop(shopId: string): Promise<void> {
  return apiRequest<void>(`/shops/${shopId}/follow`, { method: "DELETE" });
}

export async function getMyFollowing(): Promise<ApiFollower[]> {
  return apiRequest<ApiFollower[]>("/users/me/following");
}

export async function leaveReview(shopId: string, rating: number, comment?: string): Promise<ApiReview> {
  return apiRequest<ApiReview>(`/shops/${shopId}/reviews`, {
    method: "POST",
    json: { rating, comment },
  });
}

export async function getMlDiagnostics(): Promise<{
  weights: Record<string, number>;
  bias: number;
  epochs: number;
  learning_rate: number;
  sample_count: number;
  loss_history: Array<{ epoch: number; loss: number }>;
  algorithm: string;
  accuracy: number;
}> {
  return apiRequest<any>("/shops/me/ml-diagnostics");
}
