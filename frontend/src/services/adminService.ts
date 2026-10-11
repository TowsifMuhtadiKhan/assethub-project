import { getBackendApiUrl } from "../utils/googleDrive";

export interface AdminUser {
  id: string;
  role: string;
  name: string;
}

export interface DispatchedMessageLog {
  id: string;
  timestamp: string;
  to: string;
  recipientName?: string;
  itemTitle?: string;
  message: string;
  status: "DELIVERED" | "FAILED";
  messageId?: string;
  error?: string;
}

export interface AdminStats {
  totalMessages: number;
  delivered: number;
  failed: number;
  whatsapp: {
    configured: boolean;
    provider: string;
    status: string;
    connectedPhone?: string | null;
    error?: string | null;
  };
  googleDrive: {
    configured: boolean;
    authorized: boolean;
    accountEmail?: string | null;
    folderId?: string;
  };
}

const ADMIN_STORAGE_KEY = "lifenest_admin_token";
const ADMIN_USER_KEY = "lifenest_admin_user";

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_STORAGE_KEY);
}

export function getStoredAdminUser(): AdminUser | null {
  try {
    const raw = localStorage.getItem(ADMIN_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearAdminSession(): void {
  localStorage.removeItem(ADMIN_STORAGE_KEY);
  localStorage.removeItem(ADMIN_USER_KEY);
}

async function adminFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const apiUrl = getBackendApiUrl();
  const token = getAdminToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(`${apiUrl}${path}`, {
    ...options,
    headers,
  });
}

export async function adminLogin(id: string, pass: string): Promise<{
  success: boolean;
  token?: string;
  admin?: AdminUser;
  message?: string;
}> {
  try {
    const res = await adminFetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, password: pass }),
    });
    const data = await res.json();
    if (res.ok && data.success && data.token) {
      localStorage.setItem(ADMIN_STORAGE_KEY, data.token);
      if (data.admin) {
        localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(data.admin));
      }
      return { success: true, token: data.token, admin: data.admin };
    }
    return { success: false, message: data.message || "Invalid Admin ID or Password" };
  } catch (err) {
    // Local fallback for offline/direct checking
    if (id === "Towsif" && pass === "Admin") {
      const fallbackUser: AdminUser = { id: "Towsif", role: "SuperAdmin", name: "Towsif" };
      localStorage.setItem(ADMIN_STORAGE_KEY, "admin_local_token_towsif");
      localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(fallbackUser));
      return { success: true, token: "admin_local_token_towsif", admin: fallbackUser };
    }
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to connect to backend",
    };
  }
}

export async function getAdminStats(): Promise<AdminStats | null> {
  try {
    const res = await adminFetch("/api/admin/stats");
    if (res.ok) {
      const data = await res.json();
      return data.stats;
    }
  } catch {}
  return null;
}

export async function getAdminMessages(): Promise<DispatchedMessageLog[]> {
  try {
    const res = await adminFetch("/api/admin/messages");
    if (res.ok) {
      const data = await res.json();
      return data.messages || [];
    }
  } catch {}
  return [];
}

export async function clearAdminMessages(): Promise<boolean> {
  try {
    const res = await adminFetch("/api/admin/messages", {
      method: "DELETE",
    });
    return res.ok;
  } catch {
    return false;
  }
}
