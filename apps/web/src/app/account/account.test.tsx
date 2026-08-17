// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AccountClient } from "./account-client";
import { ProfileClient } from "./profile/profile-client";
import { CustomerAuthProvider } from "../../context/customer-auth-context";
import { AuthApi, AuthTokenStore } from "../../lib/auth/auth-api";

const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockPathname = "/account";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => mockPathname,
}));

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:5000/api/v1";

describe("Stage 8.6: Customer Account UX Refinement Tests", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    AuthTokenStore.setAccessToken(null);
    mockPathname = "/account";
    mockPush.mockReset();
    mockReplace.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("1. Account overview shows authenticated customer name and reference code", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { accessToken: "test-token" },
        }),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 2,
            referenceCode: "CUS-000002",
            name: "Sushil Kumar",
            email: "sushil@example.com",
            phone: "9876543210",
            role: "customer",
            status: "active",
            emailVerifiedAt: "2026-08-07T10:00:00Z",
            createdAt: "2026-08-01T10:00:00Z",
            lastLoginAt: "2026-08-07T12:00:00Z",
          },
        }),
      } as any);

    render(
      <CustomerAuthProvider>
        <AccountClient />
      </CustomerAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Welcome back, Sushil Kumar!")).toBeInTheDocument();
      expect(screen.getAllByText("CUS-000002")[0]).toBeInTheDocument();
      expect(screen.getByText("sushil@example.com")).toBeInTheDocument();
    });
  });

  it("2. Account overview handles missing optional profile fields safely", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { accessToken: "test-token" },
        }),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 3,
            referenceCode: "CUS-000003",
            name: "Jane Doe",
            email: "jane@example.com",
            phone: null,
            role: "customer",
            status: "active",
            emailVerifiedAt: null,
            createdAt: "2026-08-05T10:00:00Z",
            lastLoginAt: null,
          },
        }),
      } as any);

    render(
      <CustomerAuthProvider>
        <AccountClient />
      </CustomerAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Welcome back, Jane Doe!")).toBeInTheDocument();
      expect(screen.getByText("Not provided")).toBeInTheDocument();
      expect(screen.getByText("Not Verified")).toBeInTheDocument();
    });
  });

  it("3. Profile route renders real customer profile information", async () => {
    mockPathname = "/account/profile";
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { accessToken: "test-token" },
        }),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 2,
            referenceCode: "CUS-000002",
            name: "Sushil Kumar",
            email: "sushil@example.com",
            phone: "9876543210",
            role: "customer",
            status: "active",
            emailVerifiedAt: "2026-08-07T10:00:00Z",
            createdAt: "2026-08-01T10:00:00Z",
            lastLoginAt: "2026-08-07T12:00:00Z",
          },
        }),
      } as any);

    render(
      <CustomerAuthProvider>
        <ProfileClient />
      </CustomerAuthProvider>
    );

    const titleEl = await screen.findByText(/Personal Profile Details/i);
    expect(titleEl).toBeInTheDocument();
    expect(screen.getAllByText(/Customer Reference Code/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText("CUS-000002")[0]).toBeInTheDocument();
  });

  it("4. Unauthenticated account access redirects to signin", async () => {
    vi.spyOn(AuthApi, "refresh").mockResolvedValue(null);

    render(
      <CustomerAuthProvider>
        <AccountClient />
      </CustomerAuthProvider>
    );

    await waitFor(
      () => {
        expect(mockReplace).toHaveBeenCalledWith("/signin");
      },
      { timeout: 3000 }
    );
  });

  it("5. Account navigation links Overview and Profile correctly", async () => {
    mockPathname = "/account";
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { accessToken: "test-token" },
        }),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 2,
            referenceCode: "CUS-000002",
            name: "Sushil Kumar",
            email: "sushil@example.com",
            phone: null,
            role: "customer",
            status: "active",
            emailVerifiedAt: null,
            createdAt: "2026-08-01T10:00:00Z",
            lastLoginAt: null,
          },
        }),
      } as any);

    render(
      <CustomerAuthProvider>
        <AccountClient />
      </CustomerAuthProvider>
    );

    await waitFor(() => {
      const overviewLink = screen.getByText("Overview").closest("a");
      const profileLink = screen.getByText("Profile").closest("a");
      expect(overviewLink).toHaveAttribute("aria-current", "page");
      expect(profileLink).not.toHaveAttribute("aria-current");
    });
  });

  it("6. Logout remains functional and clears auth state", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { accessToken: "test-token" },
        }),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 2, name: "Sushil Kumar" },
        }),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {},
        }),
      } as any);

    render(
      <CustomerAuthProvider>
        <AccountClient />
      </CustomerAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Welcome back, Sushil Kumar/i)).toBeInTheDocument();
    });

    const logoutBtn = screen.getByText("Sign Out");
    fireEvent.click(logoutBtn);

    await waitFor(() => {
      expect(AuthTokenStore.getAccessToken()).toBeNull();
      expect(mockPush).toHaveBeenCalledWith("/signin");
    });
  });
});
