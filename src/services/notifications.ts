import { apiRequest } from "@/api/client";
import type { ApiNotification } from "@/types/product";

export async function getMyNotifications(): Promise<ApiNotification[]> {
  return apiRequest<ApiNotification[]>("/notifications");
}

export async function markAllNotificationsAsRead(): Promise<{ message: string }> {
  return apiRequest<{ message: string }>("/notifications/read", {
    method: "POST",
  });
}
