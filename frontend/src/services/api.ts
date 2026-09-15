const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api"
).replace(/\/$/, "");
const TOKEN_KEY = "assethub-api-token";
const USER_EMAIL_KEY = "assethub-api-user-email";

export const hasApiConnection = Boolean(API_BASE_URL);
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const saveToken = (token: string) =>
  localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);
export const getUserEmail = () => localStorage.getItem(USER_EMAIL_KEY) ?? "";

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `API request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function login(email: string, password: string) {
  const result = await apiRequest<{
    token: string;
    user: { id: string; email: string };
  }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  saveToken(result.token);
  localStorage.setItem(USER_EMAIL_KEY, result.user.email);
  return result.user;
}

export async function register(email: string, password: string) {
  const result = await apiRequest<{
    token: string;
    user: { id: string; email: string };
  }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  saveToken(result.token);
  localStorage.setItem(USER_EMAIL_KEY, result.user.email);
  return result.user;
}
