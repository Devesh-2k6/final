export type ApiShopSummary = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  average_rating: number;
  rating_count: number;
  phone_number?: string;
  description?: string | null;
  deal_count?: number;
  is_active?: boolean;
  location_verified?: boolean;
  approval_status?: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED" | string;
  approval_reason?: string | null;
  location_verification_name?: string | null;
  location_verification_address?: string | null;
  location_verification_category?: string | null;
  location_verification_distance_meters?: number | null;
};

export type ProductCategory =
  | "BAKERY"
  | "DAIRY"
  | "PRODUCE"
  | "MEAT"
  | "PANTRY"
  | "PREPARED_FOOD"
  | "OTHER";

export type ApiProduct = {
  id: string;
  shop_id: string;
  name: string;
  original_price: number;
  discount_price: number;
  current_price: number | null;
  quantity: number;
  manufacturing_date: string;
  expiry_date: string;
  category: ProductCategory;
  front_image_url: string;
  expiry_image_url: string;
  voice_note_url: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  is_surprise_bag: boolean;
  auto_discount_enabled: boolean;
  auto_discount_min_price: number | null;
  shop: ApiShopSummary | null;
};

export type ApiProductCreate = Omit<
  ApiProduct,
  "id" | "created_at" | "shop" | "is_active" | "shop_id" | "current_price" | "discount_price"
> & {
  is_active?: boolean;
  discount_price?: number | null;
};

export type ReservationStatus = "PENDING" | "COMPLETED" | "CANCELLED";
export type PaymentStatus = "UNPAID" | "PAID" | "REFUNDED";

export type ApiReservation = {
  id: string;
  user_id: string;
  shop_id: string;
  product_id: string;
  quantity: number;
  total_price: number;
  status: ReservationStatus;
  payment_status: PaymentStatus;
  pickup_code: string;
  created_at: string;
  product: ApiProduct;
};

export type ApiFavorite = {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product: ApiProduct;
};

export type ApiReview = {
  id: string;
  user_id: string;
  shop_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export type ApiFollower = {
  id: string;
  shop_id: string;
  user_id: string;
  created_at: string;
  shop: ApiShopSummary;
};

export type ApiAnalytics = {
  total_revenue: number;
  total_items_saved: number;
  active_reservations: number;
  average_rating: number;
  recent_reviews: ApiReview[];
  total_products?: number;
  active_deals?: number;
  orders_received?: number;
  revenue_summary?: number;
};

export type ApiNotification = {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export type OrderType = "PICKUP" | "DELIVERY";
export type OrderStatus = "PENDING" | "ACCEPTED" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";

export type ApiOrder = {
  id: string;
  customer_id: string;
  shopkeeper_id: string;
  shop_id: string;
  product_id: string;
  order_type: OrderType;
  status: OrderStatus;
  quantity: number;
  total_price: number;
  delivery_fee: number;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  created_at: string;
  completed_at: string | null;
  product: ApiProduct;
};

export type ApiOrderCreate = {
  product_id: string;
  order_type: OrderType;
  quantity: number;
  delivery_fee?: number;
  customer_name?: string;
  customer_phone?: string;
  delivery_address?: string;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role?: "CUSTOMER" | "SHOPKEEPER" | "ADMIN" | string;
  is_shop_owner: boolean;
  email_verified?: boolean;
  phone_number?: string;
  total_money_saved?: number;
  total_items_saved?: number;
  co2_saved_kg?: number;
};

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

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};

export type VerifyEmailResponse = {
  success: boolean;
  message: string;
  email?: string;
  user?: AuthUser;
};

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
