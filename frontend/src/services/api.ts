import { supabase } from "../lib/supabase";

const USER_EMAIL_KEY = "assethub-api-user-email";

export const hasApiConnection = true;

export const getToken = () => {
  return localStorage.getItem("assethub-api-token") ?? "";
};

export const saveToken = (token: string) => {
  localStorage.setItem("assethub-api-token", token);
};

export const clearToken = () => {
  localStorage.removeItem("assethub-api-token");
  localStorage.removeItem(USER_EMAIL_KEY);
  void supabase.auth.signOut();
};

export const getUserEmail = () => {
  return localStorage.getItem(USER_EMAIL_KEY) ?? "";
};

export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  if (data.session) {
    saveToken(data.session.access_token);
  }
  if (data.user?.email) {
    localStorage.setItem(USER_EMAIL_KEY, data.user.email);
  }
  return data.user;
}

export async function register(email: string, password: string) {
  const emailRedirectTo = typeof window !== "undefined" ? window.location.origin : undefined;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
    },
  });
  if (error) throw error;
  if (data.session) {
    saveToken(data.session.access_token);
  }
  if (data.user?.email) {
    localStorage.setItem(USER_EMAIL_KEY, data.user.email);
  }
  return data.user;
}

export async function apiRequest<T>(_path: string, _options: RequestInit = {}): Promise<T> {
  throw new Error("API requests are migrated to Supabase client services directly.");
}
