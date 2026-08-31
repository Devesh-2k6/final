import { apiRequest } from "@/api/client";
import type { ApiProduct, ApiProductCreate, ProductCategory, ApiFavorite } from "@/types/product";

export type GetProductsParams = {
  skip?: number;
  limit?: number;
  hideExpired?: boolean;
  shopId?: string;
  q?: string;
  category?: ProductCategory;
  lat?: number;
  lng?: number;
  radius_km?: number;
};

export async function getProducts(params: GetProductsParams = {}): Promise<ApiProduct[]> {
  const search = new URLSearchParams();
  if (params.skip != null) search.set("skip", String(params.skip));
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.shopId) search.set("shop_id", params.shopId);
  if (params.hideExpired === false) {
    search.set("hide_expired", "false");
  }
  if (params.q) search.set("q", params.q);
  if (params.category) search.set("category", params.category);
  if (params.lat != null) search.set("lat", String(params.lat));
  if (params.lng != null) search.set("lng", String(params.lng));
  if (params.radius_km != null) search.set("radius_km", String(params.radius_km));
  
  const qs = search.toString();
  const path = qs ? `/products/?${qs}` : "/products/";
  return apiRequest<ApiProduct[]>(path);
}

export type ApiProductOptimizeRequest = {
  name: string;
  mfg_date: string;
  expiry_date: string;
  original_price: number;
  quantity: number;
};

export type ApiProductOptimizeResponse = {
  suggested_description: string;
  suggested_discount_tier: string;
  suggested_discount_percent: number;
  confidence_score: number;
};

export async function optimizeProductDetails(
  payload: ApiProductOptimizeRequest
): Promise<ApiProductOptimizeResponse> {
  return apiRequest<ApiProductOptimizeResponse>("/products/optimize", {
    method: "POST",
    json: payload,
  });
}

export async function createProduct(product: ApiProductCreate): Promise<ApiProduct> {
  return apiRequest<ApiProduct>("/products/", {
    method: "POST",
    json: product,
  });
}

export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiRequest<{ url: string }>("/upload/image", {
    method: "POST",
    body: formData,
    // Note: Don't set Content-Type header when using FormData, fetch does it automatically with boundary
  });
  return response.url;
}

export async function updateProduct(
  productId: string,
  product: ApiProductCreate
): Promise<ApiProduct> {
  return apiRequest<ApiProduct>(`/products/${productId}`, {
    method: "PUT",
    json: product,
  });
}

export async function deleteProduct(productId: string): Promise<void> {
  await apiRequest(`/products/${productId}`, {
    method: "DELETE",
  });
}

// Favorites
export async function addFavorite(productId: string): Promise<ApiFavorite> {
  return apiRequest<ApiFavorite>("/favorites/", {
    method: "POST",
    json: { product_id: productId },
  });
}

export async function removeFavorite(productId: string): Promise<void> {
  await apiRequest(`/favorites/${productId}`, {
    method: "DELETE",
  });
}

export async function getFavorites(): Promise<ApiFavorite[]> {
  return apiRequest<ApiFavorite[]>("/favorites/me");
}

export async function getRecommendedProducts(): Promise<ApiProduct[]> {
  return apiRequest<ApiProduct[]>("/products/recommended");
}

export type ApiProductForecast = {
  rescue_probability: number;
  rescue_confidence_tier: "Low" | "Medium" | "High";
  predicted_demand_24h: number;
  predicted_orders_trend: Array<{ hour: string; demand: number }>;
  optimal_discount_percent: number;
  optimal_price: number;
  pricing_explanation: string;
  spoilage_risk_score: "Low" | "Medium" | "High";
  explainability: {
    days_left_impact: number;
    stock_impact: number;
    discount_impact: number;
    category_demand_impact: number;
  };
  sellout_hours: number;
  model_confidence: number;
  demand_score: number;
};

export async function getProductForecast(productId: string): Promise<ApiProductForecast> {
  return apiRequest<ApiProductForecast>(`/products/${productId}/forecast`);
}

export type ApiShopAiInventory = {
  average_rescue_probability: number;
  risk_counts: {
    Low: number;
    Medium: number;
    High: number;
  };
  total_recovered_revenue: number;
  co2_saved_kg: number;
  water_saved_liters: number;
  items_rescued: number;
  predicted_sellout_within_24h: number;
};

export async function getProductAiInsight(productId: string): Promise<ApiProductForecast> {
  return apiRequest<ApiProductForecast>(`/products/${productId}/ai-insight`);
}

export async function getShopAiInventory(): Promise<ApiShopAiInventory> {
  return apiRequest<ApiShopAiInventory>("/shops/me/analytics/ai-inventory");
}

export async function scanProductDates(file: File): Promise<{
  manufacturing_date: string | null;
  expiry_date: string | null;
  confidence_score: number;
  detected_text: string;
}> {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest<any>("/products/scan-dates", {
    method: "POST",
    body: formData,
  });
}

export async function lookupBarcode(barcode: string): Promise<{
  name: string | null;
  brand: string | null;
  category: ProductCategory | null;
  description: string | null;
}> {
  return apiRequest<any>(`/products/barcode/${barcode}`);
}

export type DeepSearchParams = {
  q?: string;
  semantic?: boolean;
  recipeMode?: boolean;
  maxPrice?: number;
  minDiscountPct?: number;
  expiryUrgency?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
};

export type ApiRecipeSearchResponse = {
  recipe_mode: true;
  recipe_name: string;
  ingredients: string[];
  matched_deals: ApiProduct[];
  missing_ingredients: string[];
  estimated_total_cost: number;
  total_savings: number;
};

export type ApiRegularSearchResponse = {
  recipe_mode: false;
  products: ApiProduct[];
};

export type ApiDeepSearchResponse = ApiRecipeSearchResponse | ApiRegularSearchResponse;

export async function getDeepSearchResults(params: DeepSearchParams): Promise<ApiDeepSearchResponse> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.semantic) search.set("semantic", "true");
  if (params.recipeMode) search.set("recipe_mode", "true");
  if (params.maxPrice != null) search.set("max_price", String(params.maxPrice));
  if (params.minDiscountPct != null) search.set("min_discount_pct", String(params.minDiscountPct));
  if (params.expiryUrgency) search.set("expiry_urgency", params.expiryUrgency);
  if (params.lat != null) search.set("lat", String(params.lat));
  if (params.lng != null) search.set("lng", String(params.lng));
  if (params.radiusKm != null) search.set("radius_km", String(params.radiusKm));

  const qs = search.toString();
  const path = qs ? `/products/search/deep?${qs}` : "/products/search/deep";
  return apiRequest<ApiDeepSearchResponse>(path);
}

export type RecipeProductItem = {
  name: string;
  category: string;
  quantity?: number;
};

export type RecipeIngredientItem = {
  name: string;
  is_deal: boolean;
  quantity: string;
};

export type RecipeStep = {
  step_number: number;
  instruction: string;
};

export type ApiRecipeResponse = {
  recipe_name: string;
  description: string;
  prep_time: string;
  cook_time: string;
  difficulty: string;
  ingredients: RecipeIngredientItem[];
  instructions: RecipeStep[];
  waste_saved_summary: string;
};

export async function generateRecipe(products: RecipeProductItem[]): Promise<ApiRecipeResponse> {
  return apiRequest<ApiRecipeResponse>("/products/recipe-generator", {
    method: "POST",
    json: { products },
  });
}

export type ApiVoiceProductParseResponse = {
  success: boolean;
  name: string;
  category: ProductCategory;
  quantity: number;
  original_price: number;
  discount_price: number;
  manufacturing_date: string;
  expiry_date: string;
  description: string;
  image_url?: string | null;
  detected_language: string;
  spoken_summary: string;
  raw_transcript: string;
};

export async function parseVoiceProductListing(
  transcript: string,
  language: string = "auto"
): Promise<ApiVoiceProductParseResponse> {
  return apiRequest<ApiVoiceProductParseResponse>("/products/voice-parse", {
    method: "POST",
    json: { transcript: transcript.trim(), language },
    skipAuth: true,
  });
}



