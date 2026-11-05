import { findWorldEasiestRecipe } from "../lib/recipes/engine";
import { apiRequest } from "../api/client";
import type {
  ApiProduct,
  ApiProductCreate,
  ProductCategory,
  ApiFavorite,
  ApiProductForecast,
  ApiShopAiInventory,
  ApiRecipeResponse,
} from "../types";

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
  if (params.hideExpired === false) search.set("hide_expired", "false");
  if (params.q) search.set("q", params.q);
  if (params.category) search.set("category", params.category);
  if (params.lat != null) search.set("lat", String(params.lat));
  if (params.lng != null) search.set("lng", String(params.lng));
  if (params.radius_km != null) search.set("radius_km", String(params.radius_km));

  const qs = search.toString();
  const path = qs ? `/products?${qs}` : "/products";
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
  return apiRequest<ApiProduct>("/products", {
    method: "POST",
    json: product,
  });
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

/**
 * Upload an image natively from a local mobile file URI
 */
export async function uploadImageNative(imageUri: string): Promise<string> {
  const filename = imageUri.split("/").pop() || "upload.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : "image/jpeg";

  const formData = new FormData();
  formData.append("file", {
    uri: imageUri,
    name: filename,
    type,
  } as any);

  const res = await apiRequest<{ url: string }>("/upload/image", {
    method: "POST",
    body: formData,
  });
  return res.url;
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

export async function getProductForecast(productId: string): Promise<ApiProductForecast> {
  return apiRequest<ApiProductForecast>(`/products/${productId}/forecast`);
}

export async function getShopAiInventory(): Promise<ApiShopAiInventory> {
  return apiRequest<ApiShopAiInventory>("/shops/me/analytics/ai-inventory");
}

/**
 * Upload an image from native camera/gallery to scan dates with OCR
 */
export async function scanProductDatesNative(imageUri: string): Promise<{
  manufacturing_date: string | null;
  expiry_date: string | null;
  confidence_score: number;
  detected_text: string;
}> {
  const filename = imageUri.split("/").pop() || "scan.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : "image/jpeg";

  const formData = new FormData();
  formData.append("file", {
    uri: imageUri,
    name: filename,
    type,
  } as any);

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
  suggested_price?: number | null;
  image_url?: string | null;
}> {
  return apiRequest<any>(`/products/barcode/${barcode}`, { skipAuth: true });
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

export async function getDeepSearchResults(
  params: DeepSearchParams
): Promise<ApiDeepSearchResponse> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.semantic) search.set("semantic", "true");
  if (params.recipeMode) search.set("recipe_mode", "true");
  if (params.maxPrice != null) search.set("max_price", String(params.maxPrice));
  if (params.minDiscountPct != null)
    search.set("min_discount_pct", String(params.minDiscountPct));
  if (params.expiryUrgency) search.set("expiry_urgency", params.expiryUrgency);
  if (params.lat != null) search.set("lat", String(params.lat));
  if (params.lng != null) search.set("lng", String(params.lng));
  if (params.radiusKm != null) search.set("radius_km", String(params.radiusKm));

  const qs = search.toString();
  const path = qs ? `/products/search/deep?${qs}` : "/products/search/deep";
  return apiRequest<ApiDeepSearchResponse>(path);
}

export async function generateRecipe(
  products: Array<{ name: string; category: string; quantity?: number }>
): Promise<ApiRecipeResponse> {
  try {
    const res = await apiRequest<ApiRecipeResponse>("/api/products/recipe-generator", {
      method: "POST",
      json: { products },
    });
    if (res && res.recipe_name && Array.isArray(res.ingredients) && Array.isArray(res.instructions)) {
      return res;
    }
  } catch {
    try {
      const fallbackRes = await apiRequest<ApiRecipeResponse>("/products/recipe-generator", {
        method: "POST",
        json: { products },
      });
      if (fallbackRes && fallbackRes.recipe_name) return fallbackRes;
    } catch {}
  }
  return findWorldEasiestRecipe(products);
}

export async function broadcastScannerResult(data: {
  barcode: string;
  name?: string | null;
  brand?: string | null;
  category?: string | null;
  description?: string | null;
  suggested_price?: number | null;
  image_url?: string | null;
  is_pickup_verification?: boolean;
  pickup_status?: string;
}): Promise<void> {
  try {
    await apiRequest("/api/scanner", {
      method: "POST",
      json: {
        ...data,
        source: "expo_go",
      },
      skipAuth: true,
    });
  } catch (err) {
    console.log("Scanner relay notice:", err);
  }
}

export async function verifyPickupPass(code: string): Promise<{
  success: boolean;
  message: string;
  type?: string;
  item?: any;
}> {
  try {
    return await apiRequest<any>("/api/scanner/verify-pickup", {
      method: "POST",
      json: { code },
      skipAuth: true,
    });
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to verify pickup pass.",
    };
  }
}
