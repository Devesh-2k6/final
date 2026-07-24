export const TOKEN_KEY = "expirygo_auth_token";
export const ROLE_INTENT_KEY = "expirygo_role_intent";

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function setRoleIntent(role: string): void {
  localStorage.setItem(ROLE_INTENT_KEY, role);
}

export function getRoleIntent(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ROLE_INTENT_KEY);
}

export function clearRoleIntent(): void {
  localStorage.removeItem(ROLE_INTENT_KEY);
}

// Aliases for compatibility
export const saveAuthToken = setAuthToken;
export const removeAuthToken = clearAuthToken;
export const saveRoleIntent = setRoleIntent;
export const removeRoleIntent = clearRoleIntent;
