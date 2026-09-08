import { apiRequest } from "../api/client";
import type { AuthResponse, AuthUser, VerifyEmailResponse } from "../types";

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

export async function customerSignup(data: {
  name: string;
  email: string;
  password?: string;
}): Promise<SendOtpResponse> {
  return apiRequest<SendOtpResponse>("/auth/customer/register", {
    method: "POST",
    json: data,
    skipAuth: true,
  });
}

export async function vendorSignup(data: {
  shop_name: string;
  email: string;
  phone_number: string;
  password?: string;
  photo_url?: string;
  document_url?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}): Promise<SendOtpResponse> {
  return apiRequest<SendOtpResponse>("/auth/vendor/register", {
    method: "POST",
    json: data,
    skipAuth: true,
  });
}

export type VerifyOtpInput = {
  identifier: string;
  otp: string;
  is_shop_owner?: boolean;
  name?: string;
  phone_number?: string;
};

export async function verifyOtp(data: VerifyOtpInput): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/verify-otp", {
    method: "POST",
    json: {
      identifier: data.identifier.trim().toLowerCase(),
      otp: data.otp.trim(),
      is_shop_owner: data.is_shop_owner,
      name: data.name?.trim(),
      phone_number: data.phone_number?.trim(),
    },
    skipAuth: true,
  });
}

export type ForgotPasswordResponse = {
  success: boolean;
  message: string;
  expires_in_seconds?: number;
  cooldown_remaining?: number;
  dev_code?: string;
};

export type ResetPasswordInput = {
  email: string;
  otp: string;
  new_password: string;
};

export type ResetPasswordResponse = {
  success: boolean;
  message: string;
  access_token?: string;
  token_type?: string;
  user?: AuthUser;
};

export async function forgotPassword(email: string): Promise<ForgotPasswordResponse> {
  return apiRequest<ForgotPasswordResponse>("/auth/forgot-password", {
    method: "POST",
    json: { email: email.trim().toLowerCase() },
    skipAuth: true,
  });
}

export async function resetPassword(data: ResetPasswordInput): Promise<ResetPasswordResponse> {
  return apiRequest<ResetPasswordResponse>("/auth/reset-password", {
    method: "POST",
    json: {
      email: data.email.trim().toLowerCase(),
      otp: data.otp.trim(),
      new_password: data.new_password.trim(),
    },
    skipAuth: true,
  });
}





