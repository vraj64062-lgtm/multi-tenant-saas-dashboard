import { AuthenticatedUser } from "../middleware/auth.ts";

let accessTokenInMemory: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export const setAccessToken = (token: string | null) => {
  accessTokenInMemory = token;
};

export const getAccessToken = () => {
  return accessTokenInMemory;
};

/**
 * Perform automatic token refresh using the httpOnly cookie
 */
const refreshAccessToken = async (): Promise<string | null> => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch("/api/auth/refresh-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to refresh token");
      }

      const data = await response.json();
      const token = data.accessToken;
      setAccessToken(token);
      return token;
    } catch (error) {
      console.error("Token refresh failed:", error);
      setAccessToken(null);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

/**
 * Custom Fetch client that automatically handles:
 * - Attaching the Bearer access token
 * - Silent token refresh if access token is expired (401 response)
 * - JSON content typing
 */
export const apiFetch = async (url: string, options: RequestInit = {}): Promise<any> => {
  const headers = new Headers(options.headers || {});

  // Add access token if we have it in memory
  let token = getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, { ...options, headers });

  // If unauthorized (token probably expired), attempt token refresh and retry once
  if (response.status === 401 && !url.includes("/api/auth/login") && !url.includes("/api/auth/signup")) {
    console.log("Token expired or missing. Attempting silent token refresh...");
    const newToken = await refreshAccessToken();
    if (newToken) {
      const retryHeaders = new Headers(options.headers || {});
      retryHeaders.set("Authorization", `Bearer ${newToken}`);
      if (!retryHeaders.has("Content-Type") && !(options.body instanceof FormData)) {
        retryHeaders.set("Content-Type", "application/json");
      }
      return fetch(url, { ...options, headers: retryHeaders }).then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Request failed after refresh token rotation");
        }
        return res.json();
      });
    } else {
      // Refresh failed, clear session
      throw new Error("Session expired. Please log in again.");
    }
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || "An unexpected error occurred");
  }

  return response.json();
};
