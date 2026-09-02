import { apiRequest } from "../api/client";
import type { AdminShop, AdminStats } from "../types";

export async function getPendingShops(): Promise<AdminShop[]> {
  return apiRequest<AdminShop[]>("/admin/shops/pending");
}

export async function getAllShops(status?: string): Promise<AdminShop[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiRequest<AdminShop[]>(`/admin/shops${query}`);
}

export async function approveShop(
  shopId: string,
  notes?: string,
  overrideLocationCheck: boolean = false,
  overrideReason?: string
): Promise<AdminShop> {
  return apiRequest<AdminShop>(`/admin/shops/${shopId}/approve`, {
    method: "POST",
    json: {
      notes: notes || null,
      override_location_check: overrideLocationCheck,
      override_reason: overrideReason || null,
    },
  });
}

export async function reverifyShopLocation(shopId: string): Promise<AdminShop> {
  return apiRequest<AdminShop>(`/admin/shops/${shopId}/reverify-location`, {
    method: "POST",
  });
}

export async function rejectShop(shopId: string, reason: string): Promise<AdminShop> {
  return apiRequest<AdminShop>(`/admin/shops/${shopId}/reject`, {
    method: "POST",
    json: { reason: reason.trim() },
  });
}

export async function suspendShop(shopId: string, reason?: string): Promise<AdminShop> {
  return apiRequest<AdminShop>(`/admin/shops/${shopId}/suspend`, {
    method: "POST",
    json: { reason: reason || null },
  });
}

export async function reactivateShop(shopId: string): Promise<AdminShop> {
  return apiRequest<AdminShop>(`/admin/shops/${shopId}/reactivate`, {
    method: "POST",
  });
}

export async function getAdminStats(): Promise<AdminStats> {
  return apiRequest<AdminStats>("/admin/stats");
}
