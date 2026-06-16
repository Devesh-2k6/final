/**
 * Types aligned with FastAPI/Pydantic JSON (snake_case field names).
 */

export type ApiShopSummary = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  average_rating: number;
  rating_count: number;
  phone_number?: string;
};

export type ProductCategory = "BAKERY" | "DAIRY" | "PRODUCE" | "MEAT" | "PANTRY" | "PREPARED_FOOD" | "OTHER";

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

export type ApiProductCreate = Omit<ApiProduct, "id" | "created_at" | "shop" | "is_active" | "shop_id" | "current_price" | "discount_price"> & {
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


