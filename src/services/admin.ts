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
  location_override_by?: string | null;
  location_override_at?: string | null;
  location_override_reason?: string | null;
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

export async function approveShop(
  shopId: string,
  notes?: string,
  overrideLocation?: boolean,
  overrideReason?: string
): Promise<AdminShop> {
  return apiRequest<AdminShop>(`/admin/shops/${shopId}/approve`, {
    method: "POST",
    json: {
      notes: notes || null,
      override_location_check: !!overrideLocation,
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

export async function updateShopLocationByAdmin(
  shopId: string,
  data: { latitude: number; longitude: number; address?: string; reason?: string }
): Promise<AdminShop> {
  return apiRequest<AdminShop>(`/admin/shops/${shopId}/location`, {
    method: "PATCH",
    json: data,
  });
}

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "CUSTOMER" | "VENDOR" | "ADMIN";
  email_verified: boolean;
  created_at?: string;
  phone_number?: string;
  co2_saved_kg?: number;
  total_money_saved?: number;
  total_items_saved?: number;
};

export async function getAdminUsers(params?: { search?: string; role?: string }): Promise<{ total: number; users: AdminUser[] }> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.role && params.role !== "ALL") query.set("role", params.role);
  const qStr = query.toString();
  return apiRequest<{ total: number; users: AdminUser[] }>(`/admin/users${qStr ? `?${qStr}` : ""}`);
}

export async function updateAdminUserRole(userId: string, role: string): Promise<{ status: string; role: string }> {
  return apiRequest<{ status: string; role: string }>(`/admin/users/${userId}/role`, {
    method: "PATCH",
    json: { role },
  });
}

export type AdminOrder = {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_email?: string;
  shop_id: string;
  shop_name: string;
  product_name: string;
  order_type: string;
  status: string;
  payment_status: string;
  total_amount: number;
  quantity: number;
  created_at?: string;
};

export async function getAdminOrders(params?: { status?: string }): Promise<{ total: number; orders: AdminOrder[] }> {
  const query = new URLSearchParams();
  if (params?.status && params.status !== "ALL") query.set("status", params.status);
  const qStr = query.toString();
  return apiRequest<{ total: number; orders: AdminOrder[] }>(`/admin/orders${qStr ? `?${qStr}` : ""}`);
}


