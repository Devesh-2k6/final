import { apiRequest } from "@/api/client";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  is_shop_owner: boolean;
  total_money_saved?: number;
  total_items_saved?: number;
  co2_saved_kg?: number;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  is_shop_owner: boolean;
  phone_number?: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export async function register(data: RegisterInput): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    json: data,
    skipAuth: true,
  });
}

export async function login(data: LoginInput): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    json: data,
    skipAuth: true,
  });
}

export async function getMe(): Promise<AuthUser> {
  return apiRequest<AuthUser>("/users/me");
}

export async function sendOtp(phoneNumber: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>("/auth/send-otp", {
    method: "POST",
    json: { phone_number: phoneNumber },
    skipAuth: true,
  });
}

export async function verifyOtp(phoneNumber: string, code: string): Promise<{ verified: boolean; message: string }> {
  return apiRequest<{ verified: boolean; message: string }>("/auth/verify-otp", {
    method: "POST",
    json: { phone_number: phoneNumber, code },
    skipAuth: true,
  });
}
