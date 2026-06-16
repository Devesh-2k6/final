import { apiRequest } from "@/api/client";
import type { ApiReservation } from "@/types/product";

export async function createReservation(productId: string, quantity: number): Promise<ApiReservation> {
  return apiRequest<ApiReservation>("/reservations/", {
    method: "POST",
    json: { product_id: productId, quantity },
  });
}

export async function getMyReservations(): Promise<ApiReservation[]> {
  return apiRequest<ApiReservation[]>("/reservations/me");
}

export async function getShopReservations(): Promise<ApiReservation[]> {
  return apiRequest<ApiReservation[]>("/shops/reservations");
}

export async function verifyReservation(reservationId: string, pickupCode: string): Promise<{ message: string, status: string }> {
  return apiRequest<{ message: string, status: string }>(`/reservations/${reservationId}/verify`, {
    method: "POST",
    json: { pickup_code: pickupCode },
  });
}

export async function checkoutReservation(reservationId: string): Promise<{ message: string, payment_status: string }> {
  return apiRequest<{ message: string, payment_status: string }>(`/reservations/${reservationId}/checkout`, {
    method: "POST",
  });
}
