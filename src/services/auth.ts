import { apiRequest } from "@/api/client";

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

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
  dev_otp?: string;
};

export type VerifyEmailResponse = {
  success: boolean;
  message: string;
  email?: string;
  user?: AuthUser;
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

export async function verifyEmail(token: string): Promise<VerifyEmailResponse> {
  return apiRequest<VerifyEmailResponse>(`/auth/verify-email?token=${encodeURIComponent(token.trim())}`, {
    method: "GET",
    skipAuth: true,
  });
}

export async function resendVerification(email: string): Promise<VerifyEmailResponse> {
  return apiRequest<VerifyEmailResponse>("/auth/resend-verification", {
    method: "POST",
    json: { email: email.trim().toLowerCase() },
    skipAuth: true,
  });
}

export async function instantVerifyEmail(email: string): Promise<VerifyEmailResponse> {
  return apiRequest<VerifyEmailResponse>("/auth/instant-verify-dev", {
    method: "POST",
    json: { email: email.trim().toLowerCase() },
    skipAuth: true,
  });
}

export async function getMe(): Promise<AuthUser> {
  return apiRequest<AuthUser>("/users/me");
}

export type SendOtpResponse = {
  success: boolean;
  message: string;
  expires_in_seconds: number;
  cooldown_remaining?: number;
  dev_code?: string;
};

export async function sendOtp(identifier: string, name?: string): Promise<SendOtpResponse> {
  return apiRequest<SendOtpResponse>("/auth/send-otp", {
    method: "POST",
    json: { identifier: identifier.trim().toLowerCase(), name: name?.trim() },
    skipAuth: true,
  });
}

export async function verifyOtp(
  identifier: string,
  otp: string,
  name?: string,
  is_shop_owner: boolean = false
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/verify-otp", {
    method: "POST",
    json: {
      identifier: identifier.trim().toLowerCase(),
      otp: otp.trim(),
      name: name?.trim(),
      is_shop_owner,
    },
    skipAuth: true,
  });
}

export async function getDevMailbox(): Promise<{ emails: Array<{ to_email: string; token?: string; subject?: string }> }> {
  return apiRequest<{ emails: Array<{ to_email: string; token?: string; subject?: string }> }>("/auth/dev-mailbox", {
    method: "GET",
    skipAuth: true,
  });
}

