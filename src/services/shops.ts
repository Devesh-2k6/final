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
};

export async function listShops(): Promise<ShopWithDescription[]> {
  return apiRequest<ShopWithDescription[]>("/shops/");
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
