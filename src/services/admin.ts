import { apiRequest } from "@/api/client";

export type AdminShop = {
  id: string;
  name: string;
  owner_id: string;
  owner_name?: string | null;
  owner_email?: string | null;
  owner_phone?: string | null;
  address: string;
  latitude: number;
  longitude: number;
  description?: string | null;
  is_active: boolean;
  location_verified: boolean;
  location_verified_at?: string | null;
  location_verification_provider?: string | null;
  location_verification_name?: string | null;
  location_verification_address?: string | null;
  location_verification_distance_meters?: number | null;
  location_verification_category?: string | null;
  approval_status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED" | string;
  approval_reason?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  rejected_at?: string | null;
  photo_url?: string | null;
  document_url?: string | null;
  verification_document_url?: string | null;
  verification_document_name?: string | null;
  created_at?: string | null;
};

export type AdminStats = {
  total_users: number;
  total_customers: number;
  total_merchants: number;
  active_shops: number;
  pending_shops: number;
  rejected_shops: number;
  suspended_shops: number;
  total_products: number;
  total_deals: number;
};

export async function getPendingShops(): Promise<AdminShop[]> {
  return apiRequest<AdminShop[]>("/admin/shops/pending");
}

export async function getAllShops(status?: string): Promise<AdminShop[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiRequest<AdminShop[]>(`/admin/shops${query}`);
}

export async function approveShop(shopId: string, notes?: string): Promise<AdminShop> {
  return apiRequest<AdminShop>(`/admin/shops/${shopId}/approve`, {
    method: "POST",
    json: { notes: notes || null },
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
