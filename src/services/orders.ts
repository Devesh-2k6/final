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

export async function getOrderById(orderId: string): Promise<ApiOrder> {
  return apiRequest<ApiOrder>(`/orders/${orderId}`);
}

export async function reportOrderPayment(orderId: string, upiTransactionId: string): Promise<ApiOrder> {
  return apiRequest<ApiOrder>(`/orders/${orderId}/report-payment`, {
    method: "POST",
    json: { upi_transaction_id: upiTransactionId },
  });
}

export async function verifyOrderPayment(orderId: string, confirmed: boolean = true): Promise<ApiOrder> {
  return apiRequest<ApiOrder>(`/orders/${orderId}/verify-payment`, {
    method: "POST",
    json: { confirmed },
  });
}

export async function verifyOrderDeliveryPin(orderId: string, pin: string): Promise<ApiOrder> {
  return apiRequest<ApiOrder>(`/orders/${orderId}/verify-delivery-pin`, {
    method: "POST",
    json: { pin },
  });
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<ApiOrder> {
  return apiRequest<ApiOrder>(`/orders/${orderId}/status`, {
    method: "PATCH",
    json: { status },
  });
}

export async function cancelOrder(orderId: string, reason?: string): Promise<ApiOrder> {
  return apiRequest<ApiOrder>(`/orders/${orderId}/cancel`, {
    method: "POST",
    json: { reason: reason || "Customer requested cancellation" },
  });
}

