export type UserRole = "CUSTOMER" | "VENDOR" | "ADMIN";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role?: UserRole | string;
  is_shop_owner: boolean;
  email_verified?: boolean;
  phone_number?: string;
  total_money_saved?: number;
  total_items_saved?: number;
  co2_saved_kg?: number;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
  dev_otp?: string;
};

export type CustomerSignupPayload = {
  name: string;
  email: string;
};

export type VendorSignupPayload = {
  shop_name: string;
  email: string;
  phone_number: string;
  photo_url?: string;
  document_url?: string;
};
