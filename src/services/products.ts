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

export const FALLBACK_PRODUCTS: ApiProduct[] = [
  {
    id: "deal-001",
    shop_id: "shop-001",
    name: "Artisan Sourdough Batard",
    original_price: 180,
    discount_price: 55,
    current_price: 55,
    quantity: 6,
    manufacturing_date: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    expiry_date: new Date(Date.now() + 1000 * 60 * 60 * 18).toISOString(),
    category: "BAKERY",
    front_image_url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80",
    expiry_image_url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80",
    voice_note_url: null,
    description: "Crispy crust, tender open crumb sourdough freshly baked this morning.",
    is_active: true,
    created_at: new Date().toISOString(),
    is_surprise_bag: false,
    auto_discount_enabled: true,
    auto_discount_min_price: 45,
    shop: {
      id: "shop-001",
      name: "Daily Bakehouse & Cafe",
      address: "14 Cathedral Road, Gopalapuram, Chennai",
      latitude: 13.0489,
      longitude: 80.2529,
      average_rating: 4.8,
      rating_count: 84,
      phone_number: "+91 98401 23456",
      is_active: true,
      delivery_enabled: true,
      delivery_fee: 30,
      min_order_amount: 100,
      location_verified: true,
      approval_status: "APPROVED"
    }
  },
  {
    id: "deal-002",
    shop_id: "shop-002",
    name: "Farm Fresh Whole Cow Milk 1L",
    original_price: 80,
    discount_price: 28,
    current_price: 28,
    quantity: 12,
    manufacturing_date: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    expiry_date: new Date(Date.now() + 1000 * 60 * 60 * 14).toISOString(),
    category: "DAIRY",
    front_image_url: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800&q=80",
    expiry_image_url: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800&q=80",
    voice_note_url: null,
    description: "Pure pasteurized farm fresh whole milk, rich and creamy.",
    is_active: true,
    created_at: new Date().toISOString(),
    is_surprise_bag: false,
    auto_discount_enabled: true,
    auto_discount_min_price: 25,
    shop: {
      id: "shop-002",
      name: "Green Valley Organics",
      address: "28 TTK Road, Alwarpet, Chennai",
      latitude: 13.0334,
      longitude: 80.2519,
      average_rating: 4.9,
      rating_count: 128,
      phone_number: "+91 98840 98765",
      is_active: true,
      delivery_enabled: true,
      delivery_fee: 25,
      min_order_amount: 50,
      location_verified: true,
      approval_status: "APPROVED"
    }
  },
  {
    id: "deal-003",
    shop_id: "shop-001",
    name: "Handmade Butter Croissant Pack (4 pcs)",
    original_price: 240,
    discount_price: 75,
    current_price: 75,
    quantity: 8,
    manufacturing_date: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    expiry_date: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    category: "BAKERY",
    front_image_url: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=80",
    expiry_image_url: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=80",
    voice_note_url: null,
    description: "Flaky, buttery Parisian croissants freshly made with pure European butter.",
    is_active: true,
    created_at: new Date().toISOString(),
    is_surprise_bag: false,
    auto_discount_enabled: true,
    auto_discount_min_price: 60,
    shop: {
      id: "shop-001",
      name: "Daily Bakehouse & Cafe",
      address: "14 Cathedral Road, Gopalapuram, Chennai",
      latitude: 13.0489,
      longitude: 80.2529,
      average_rating: 4.8,
      rating_count: 84,
      is_active: true,
      delivery_enabled: true,
      delivery_fee: 30,
      min_order_amount: 100,
      location_verified: true,
      approval_status: "APPROVED"
    }
  },
  {
    id: "deal-004",
    shop_id: "shop-003",
    name: "Hydroponic Crisp Salad Greens Box 300g",
    original_price: 130,
    discount_price: 42,
    current_price: 42,
    quantity: 9,
    manufacturing_date: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    expiry_date: new Date(Date.now() + 1000 * 60 * 60 * 30).toISOString(),
    category: "PRODUCE",
    front_image_url: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&q=80",
    expiry_image_url: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&q=80",
    voice_note_url: null,
    description: "Pesticide-free butterhead lettuce, rocket arugula, and microgreens.",
    is_active: true,
    created_at: new Date().toISOString(),
    is_surprise_bag: false,
    auto_discount_enabled: true,
    auto_discount_min_price: 35,
    shop: {
      id: "shop-003",
      name: "FreshFarm Direct Market",
      address: "52 Eldams Road, T. Nagar, Chennai",
      latitude: 13.0418,
      longitude: 80.2447,
      average_rating: 4.7,
      rating_count: 95,
      is_active: true,
      delivery_enabled: true,
      delivery_fee: 25,
      min_order_amount: 80,
      location_verified: true,
      approval_status: "APPROVED"
    }
  },
  {
    id: "deal-005",
    shop_id: "shop-004",
    name: "Evening Mystery Gourmet Surprise Bag",
    original_price: 350,
    discount_price: 99,
    current_price: 99,
    quantity: 5,
    manufacturing_date: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    expiry_date: new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString(),
    category: "PREPARED_FOOD",
    front_image_url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
    expiry_image_url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
    voice_note_url: null,
    description: "A surprise package containing 3-4 delicious bakery treats and gourmet savory items.",
    is_active: true,
    created_at: new Date().toISOString(),
    is_surprise_bag: true,
    auto_discount_enabled: true,
    auto_discount_min_price: 89,
    shop: {
      id: "shop-004",
      name: "Gourmet Deli & Treats",
      address: "102 Nungambakkam High Road, Chennai",
      latitude: 13.0604,
      longitude: 80.2425,
      average_rating: 4.9,
      rating_count: 210,
      is_active: true,
      delivery_enabled: true,
      delivery_fee: 35,
      min_order_amount: 99,
      location_verified: true,
      approval_status: "APPROVED"
    }
  },
  {
    id: "deal-006",
    shop_id: "shop-002",
    name: "Greek Yogurt Strawberry & Honey 400g",
    original_price: 160,
    discount_price: 49,
    current_price: 49,
    quantity: 11,
    manufacturing_date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    expiry_date: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
    category: "DAIRY",
    front_image_url: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=80",
    expiry_image_url: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=80",
    voice_note_url: null,
    description: "High protein strained Greek yogurt with wild strawberry puree.",
    is_active: true,
    created_at: new Date().toISOString(),
    is_surprise_bag: false,
    auto_discount_enabled: true,
    auto_discount_min_price: 40,
    shop: {
      id: "shop-002",
      name: "Green Valley Organics",
      address: "28 TTK Road, Alwarpet, Chennai",
      latitude: 13.0334,
      longitude: 80.2519,
      average_rating: 4.9,
      rating_count: 128,
      is_active: true,
      delivery_enabled: true,
      delivery_fee: 25,
      min_order_amount: 50,
      location_verified: true,
      approval_status: "APPROVED"
    }
  }
];

export async function getProducts(params: GetProductsParams = {}): Promise<ApiProduct[]> {
  try {
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
    const res = await apiRequest<ApiProduct[]>(path);
    if (Array.isArray(res) && res.length > 0) {
      return res;
    }
  } catch (err) {
    console.warn("API products unavailable, using curated fallback deals", err);
  }

  // Filter fallback products
  let filtered = [...FALLBACK_PRODUCTS];
  if (params.category) {
    filtered = filtered.filter((p) => p.category.toLowerCase() === params.category?.toLowerCase());
  }
  if (params.q) {
    const qLower = params.q.toLowerCase();
    filtered = filtered.filter((p) => 
      p.name.toLowerCase().includes(qLower) || 
      p.description?.toLowerCase().includes(qLower) ||
      p.shop?.name.toLowerCase().includes(qLower)
    );
  }
  if (params.shopId) {
    filtered = filtered.filter((p) => p.shop_id === params.shopId);
  }
  if (params.limit != null) {
    filtered = filtered.slice(params.skip || 0, (params.skip || 0) + params.limit);
  }
  return filtered;
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



