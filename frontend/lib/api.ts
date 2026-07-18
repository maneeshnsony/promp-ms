import { auth } from "@/auth";

const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";

export async function apiFetch(path: string, options: RequestInit = {}) {
  const baseUrl =
    typeof window === "undefined"
      ? process.env.API_BASE_URL
      : process.env.NEXT_PUBLIC_API_BASE_URL;

  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (!skipAuth) {
    const session = typeof window === "undefined" ? await auth() : null;
    if (session?.backendToken) {
      headers.set("Authorization", `Bearer ${session.backendToken}`);
    }
  }

  return fetch(`${baseUrl}${path}`, { ...options, headers });
}
