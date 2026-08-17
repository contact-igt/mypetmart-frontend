/* eslint-disable @typescript-eslint/no-explicit-any */
import { getApiBaseUrl } from "../config";
import { AppAuthError, NetworkError } from "./auth-errors";
import type { ApiResponse } from "./auth-types";

let inMemoryAccessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export const AuthTokenStore = {
  setAccessToken(token: string | null): void {
    inMemoryAccessToken = token;
  },
  getAccessToken(): string | null {
    return inMemoryAccessToken;
  }
};

/**
 * Normalizes and joins base URL with route path.
 */
function buildUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

/**
 * Standard fetch response parser & error transformer.
 */
async function handleResponse<T>(response: Response): Promise<T> {
  let body: ApiResponse<T>;
  try {
    body = await response.json();
  } catch {
    throw new AppAuthError(
      `HTTP Error: ${response.status} ${response.statusText}`,
      "HTTP_ERROR"
    );
  }

  if (!response.ok || !body.success) {
    const errorDetails = body.error;
    throw new AppAuthError(
      errorDetails?.message || "An unexpected error occurred.",
      errorDetails?.code || "UNEXPECTED_ERROR",
      errorDetails?.details
    );
  }

  return body.data;
}

/**
 * Standard HTTP Fetch Request wrapper.
 */
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = buildUrl(path);
  const headers = new Headers(options.headers);

  options.credentials = "include";

  if (options.body && typeof options.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = AuthTokenStore.getAccessToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  options.headers = headers;

  try {
    const res = await fetch(url, options);
    return await handleResponse<T>(res);
  } catch (err: any) {
    if (err instanceof AppAuthError) {
      throw err;
    }
    throw new NetworkError();
  }
}

/**
 * Single-flight refresh token coordinator.
 */
async function performRefresh(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const data = await request<{ accessToken: string }>("/auth/refresh", {
        method: "POST"
      });
      AuthTokenStore.setAccessToken(data.accessToken);
      return data.accessToken;
    } catch {
      AuthTokenStore.setAccessToken(null);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Fetch wrapper that automatically retries once upon token expiration.
 */
export async function fetchWithAuth<T>(path: string, options: RequestInit = {}): Promise<T> {
  const excludedPaths = [
    "/auth/signup",
    "/auth/signin",
    "/auth/refresh",
    "/auth/logout",
    "/auth/verify-email",
    "/auth/resend-verification",
    "/auth/forgot-password",
    "/auth/verify-reset-otp",
    "/auth/reset-password"
  ];
  const isExcluded = excludedPaths.some((p) => path.includes(p));

  try {
    return await request<T>(path, options);
  } catch (error: any) {
    if (
      !isExcluded &&
      error instanceof AppAuthError &&
      (error.code === "AUTH_TOKEN_EXPIRED" || error.code === "UNAUTHENTICATED")
    ) {
      const newAccessToken = await performRefresh();
      if (newAccessToken) {
        const headers = new Headers(options.headers);
        headers.set("Authorization", `Bearer ${newAccessToken}`);
        options.headers = headers;
        return await request<T>(path, options);
      }
    }
    throw error;
  }
}

export const AuthApi = {
  async signup(payload: any): Promise<any> {
    const cleanPayload = {
      name: payload.name.trim(),
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
      passwordConfirmation: payload.passwordConfirmation
    } as any;

    if (payload.phone && payload.phone.trim()) {
      cleanPayload.phone = payload.phone.trim();
    }

    const data = await fetchWithAuth<any>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(cleanPayload)
    });
    if (data.accessToken) {
      AuthTokenStore.setAccessToken(data.accessToken);
    }
    return data;
  },

  async signin(payload: any): Promise<any> {
    const cleanPayload = {
      email: payload.email.trim().toLowerCase(),
      password: payload.password
    };

    const data = await fetchWithAuth<any>("/auth/signin", {
      method: "POST",
      body: JSON.stringify(cleanPayload)
    });
    if (data.accessToken) {
      AuthTokenStore.setAccessToken(data.accessToken);
    }
    return data;
  },

  async verifyEmail(challengeId: number, otp: string): Promise<any> {
    const data = await fetchWithAuth<any>("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ challengeId, otp })
    });
    if (data.accessToken) {
      AuthTokenStore.setAccessToken(data.accessToken);
    }
    return data;
  },

  async resendVerification(payload: { challengeId?: number; email?: string }): Promise<any> {
    return await fetchWithAuth<any>("/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async forgotPassword(email: string): Promise<any> {
    return await fetchWithAuth<any>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: email.trim().toLowerCase() })
    });
  },

  async verifyResetOTP(challengeId: number | undefined, otp: string): Promise<any> {
    return await fetchWithAuth<any>("/auth/verify-reset-otp", {
      method: "POST",
      body: JSON.stringify({ challengeId: challengeId || undefined, otp })
    });
  },

  async resetPassword(payload: { password: string; passwordConfirmation: string }): Promise<any> {
    return await fetchWithAuth<any>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async refresh(): Promise<string | null> {
    return await performRefresh();
  },

  async logout(): Promise<void> {
    try {
      await fetchWithAuth<void>("/auth/logout", {
        method: "POST"
      });
    } finally {
      AuthTokenStore.setAccessToken(null);
    }
  },

  async getMe(): Promise<any> {
    return await fetchWithAuth<any>("/auth/me", {
      method: "GET"
    });
  }
};
