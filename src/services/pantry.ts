import { apiRequest } from "@/api/client";
import type { ProductCategory } from "@/types/product";
import type { ApiRecipeResponse } from "@/types/recipe";

export type ApiPantryItem = {
  id: string;
  user_id: string;
  name: string;
  category: ProductCategory;
  quantity: string;
  purchase_date: string;
  expiry_date: string;
  image_url?: string | null;
  is_consumed: boolean;
  notes?: string | null;
  created_at: string;
  days_left: number;
  hours_left: number;
  urgency_status: "FRESH" | "EXPIRING_SOON" | "CRITICAL" | "EXPIRED";
};

export type ApiPantryCreate = {
  name: string;
  category: ProductCategory;
  quantity: string;
  expiry_date: string;
  image_url?: string | null;
  notes?: string | null;
};

export type ApiPantryUpdate = {
  name?: string;
  category?: ProductCategory;
  quantity?: string;
  expiry_date?: string;
  is_consumed?: boolean;
  notes?: string | null;
};

export type ApiPantrySmartAlert = {
  item_id: string;
  item_name: string;
  hours_left: number;
  urgency: string;
  alert_message: string;
  suggested_recipe_title?: string | null;
  recipe_preview?: string | null;
};

export type ApiPantryAiScanResponse = {
  detected_items: Array<{
    name: string;
    category: ProductCategory;
    estimated_days_shelf_life: number;
    suggested_quantity: string;
    confidence: number;
  }>;
  scan_summary: string;
};

export async function getPantryItems(includeConsumed = false): Promise<ApiPantryItem[]> {
  const url = includeConsumed ? "/pantry/?include_consumed=true" : "/pantry/";
  return apiRequest<ApiPantryItem[]>(url);
}

export async function addPantryItem(data: ApiPantryCreate): Promise<ApiPantryItem> {
  return apiRequest<ApiPantryItem>("/pantry/", {
    method: "POST",
    json: data,
  });
}

export async function autoImportFromReservation(reservationId: string): Promise<ApiPantryItem> {
  return apiRequest<ApiPantryItem>(`/pantry/auto-import/${reservationId}`, {
    method: "POST",
  });
}

export async function getPantrySmartAlerts(): Promise<ApiPantrySmartAlert[]> {
  return apiRequest<ApiPantrySmartAlert[]>("/pantry/smart-alerts");
}

export async function generateRecipeFromFridge(): Promise<ApiRecipeResponse> {
  return apiRequest<ApiRecipeResponse>("/pantry/recipe-from-fridge", {
    method: "POST",
  });
}

export async function updatePantryItem(itemId: string, data: ApiPantryUpdate): Promise<ApiPantryItem> {
  return apiRequest<ApiPantryItem>(`/pantry/${itemId}`, {
    method: "PUT",
    json: data,
  });
}

export async function deletePantryItem(itemId: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/pantry/${itemId}`, {
    method: "DELETE",
  });
}
