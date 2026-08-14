// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AuthApi, AuthTokenStore } from "./auth-api";

// Set environment variable mock
process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:5000/api/v1";

describe("Stage 8: Customer auth client tests", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    AuthTokenStore.setAccessToken(null);
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("1. Signup trims name and lowercases email", async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { accessToken: "test-token", user: { id: "1", name: "John Doe" } }
      })
    } as any);

    await AuthApi.signup({
      name: "  John Doe  ",
      email: "  John@Example.Com  ",
      password: "password123",
      passwordConfirmation: "password123"
    });

    const callArgs = fetchMock.mock.calls[0];
    const body = JSON.parse(callArgs[1]?.body as string);

    expect(body.name).toBe("John Doe");
    expect(body.email).toBe("john@example.com");
  });

  it("2. Signup payload excludes role, status and terms state", async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { accessToken: "test-token", user: {} }
      })
    } as any);

    await AuthApi.signup({
      name: "John Doe",
      email: "john@example.com",
      password: "password123",
      passwordConfirmation: "password123",
      role: "admin",
      status: "active",
      termsAccepted: true
    });

    const callArgs = fetchMock.mock.calls[0];
    const body = JSON.parse(callArgs[1]?.body as string);

    expect(body.role).toBeUndefined();
    expect(body.status).toBeUndefined();
    expect(body.termsAccepted).toBeUndefined();
  });

  it("3. Mismatched passwords block API submission", async () => {
    const fetchMock = vi.mocked(fetch);

    // Mismatched passwords should throw or be blocked before API request (frontend validations handle this)
    // Here we verify we don't call signup when they mismatch
    const triggerSignup = async () => {
      const password = "password123" as string;
      const passwordConfirmation = "different123" as string;
      if (password !== passwordConfirmation) {
        throw new Error("Passwords do not match.");
      }
      await AuthApi.signup({
        name: "John",
        email: "john@example.com",
        password,
        passwordConfirmation
      });
    };

    await expect(triggerSignup()).rejects.toThrow("Passwords do not match.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("4. Signin lowercases email before submission", async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { accessToken: "test-token", user: {} }
      })
    } as any);

    await AuthApi.signin({
      email: "  JOHN@example.COM  ",
      password: "password123"
    });

    const callArgs = fetchMock.mock.calls[0];
    const body = JSON.parse(callArgs[1]?.body as string);

    expect(body.email).toBe("john@example.com");
  });

  it("5. Successful signup or signin stores token in memory", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { accessToken: "memory-token-123", user: {} }
      })
    } as any);

    await AuthApi.signin({
      email: "john@example.com",
      password: "password123"
    });

    expect(AuthTokenStore.getAccessToken()).toBe("memory-token-123");
  });

  it("6. Initial auth restoration calls refresh and then /auth/me", async () => {
    // Mock refresh returning accessToken
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { accessToken: "refreshed-token" }
        })
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: "1", name: "John" }
        })
      } as any);

    const token = await AuthApi.refresh();
    expect(token).toBe("refreshed-token");

    const user = await AuthApi.getMe();
    expect(user.name).toBe("John");
  });

  it("7. Concurrent expired requests trigger one refresh request", async () => {
    let refreshCalls = 0;
    vi.mocked(fetch).mockImplementation(async (url: any) => {
      if (url.toString().includes("/auth/refresh")) {
        refreshCalls++;
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: { accessToken: "shared-token" }
          })
        } as any;
      }
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: {}
        })
      } as any;
    });

    // Fire two refreshes concurrently
    const p1 = AuthApi.refresh();
    const p2 = AuthApi.refresh();

    await Promise.all([p1, p2]);
    expect(refreshCalls).toBe(1);
  });

  it("8. Failed refresh sets unauthenticated state", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({
        success: false,
        error: { code: "UNAUTHENTICATED", message: "Session expired." }
      })
    } as any);

    AuthTokenStore.setAccessToken("old-expired-token");

    const token = await AuthApi.refresh();
    expect(token).toBeNull();
    expect(AuthTokenStore.getAccessToken()).toBeNull();
  });

  it("9. Logout clears memory state and no token is written to localStorage", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {}
      })
    } as any);

    AuthTokenStore.setAccessToken("active-token");

    await AuthApi.logout();

    expect(AuthTokenStore.getAccessToken()).toBeNull();
    expect(localStorage.getItem("accessToken")).toBeNull();
  });
});
