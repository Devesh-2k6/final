import { apiRequest } from "@/api/client";
import type { ApiOrder, ApiOrderCreate, OrderStatus } from "@/types/product";

export async function createOrder(payload: ApiOrderCreate): Promise<ApiOrder> {
  return apiRequest<ApiOrder>("/orders/", {
    method: "POST",
    json: payload,
  });
}

export async function getMyOrders(): Promise<ApiOrder[]> {
  return apiRequest<ApiOrder[]>("/orders/me");
}

export async function getShopOrders(): Promise<ApiOrder[]> {
  return apiRequest<ApiOrder[]>("/shops/orders");
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<ApiOrder> {
  return apiRequest<ApiOrder>(`/orders/${orderId}/status`, {
    method: "PATCH",
    json: { status },
  });
}

export async function cancelOrder(orderId: string): Promise<ApiOrder> {
  return apiRequest<ApiOrder>(`/orders/${orderId}/cancel`, {
    method: "POST",
  });
}

