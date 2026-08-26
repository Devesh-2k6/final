import { apiRequest } from "../api/client";
import type { AuthResponse, AuthUser } from "../types";

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
