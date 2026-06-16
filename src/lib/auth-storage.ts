export const TOKEN_KEY = "freshsave_auth_token";
export const ROLE_INTENT_KEY = "freshsave_role_intent";

const MAX_AGE_SEC = 60 * 60 * 24 * 7;

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; path=/; max-age=${MAX_AGE_SEC}; SameSite=Lax`;
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
}

export function setRoleIntent(role: "customer" | "shop_owner"): void {
  sessionStorage.setItem(ROLE_INTENT_KEY, role);
}

export function getRoleIntent(): "customer" | "shop_owner" | null {
  const v = sessionStorage.getItem(ROLE_INTENT_KEY);
  if (v === "customer" || v === "shop_owner") return v;
  return null;
}

export function clearRoleIntent(): void {
  sessionStorage.removeItem(ROLE_INTENT_KEY);
}
