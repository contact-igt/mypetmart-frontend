// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AddressBookClient } from "./address-book-client";
import { AuthTokenStore } from "@/lib/auth/auth-api";

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => "/account/addresses",
}));

vi.mock("@/context/customer-auth-context", () => ({
  useCustomerAuth: () => ({
    status: "authenticated",
    customer: { id: 1, name: "Test Customer", referenceCode: "CUS-001" },
    logout: vi.fn(),
  }),
  CustomerAuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:5000/api/v1";

describe("Address Book Storefront Client Tests", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    AuthTokenStore.setAccessToken("test-access-token");
    mockPush.mockReset();
    mockReplace.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("1. Loads and displays saved customer addresses", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            id: 101,
            userId: 1,
            label: "Home",
            recipientName: "Jordan Rivera",
            phone: "+91 98765 43210",
            line1: "221B Baker Street",
            line2: null,
            city: "Mumbai",
            state: "Maharashtra",
            postalCode: "400001",
            country: "IN",
            isDefault: true,
          },
        ],
      }),
    } as any);

    render(<AddressBookClient />);

    await waitFor(() => {
      expect(screen.getByText("Jordan Rivera")).toBeInTheDocument();
      expect(screen.getByText("Default")).toBeInTheDocument();
      expect(screen.getByText(/221B Baker Street/)).toBeInTheDocument();
    });
  });

  it("2. Manual-only address create omits latitude and longitude keys entirely", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      // 1. GET /storefront/addresses (initial empty list)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
        }),
      } as any)
      // 2. POST /storefront/addresses
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 102,
            userId: 1,
            label: "Office",
            recipientName: "Alex Smith",
            phone: "+91 99999 88888",
            line1: "456 Corporate Towers",
            line2: null,
            city: "Pune",
            state: "Maharashtra",
            postalCode: "411001",
            country: "IN",
            isDefault: true,
            latitude: null,
            longitude: null,
          },
        }),
      } as any)
      // 3. GET /storefront/addresses (re-fetch after create)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            {
              id: 102,
              userId: 1,
              label: "Office",
              recipientName: "Alex Smith",
              phone: "+91 99999 88888",
              line1: "456 Corporate Towers",
              line2: null,
              city: "Pune",
              state: "Maharashtra",
              postalCode: "411001",
              country: "IN",
              isDefault: true,
              latitude: null,
              longitude: null,
            },
          ],
        }),
      } as any);

    render(<AddressBookClient />);

    await waitFor(() => {
      expect(screen.getByText("No addresses saved yet.")).toBeInTheDocument();
    });

    const addBtn = screen.getByText("+ Add New Address");
    fireEvent.click(addBtn);

    fireEvent.change(screen.getByLabelText(/Recipient Full Name/i), { target: { value: "Alex Smith" } });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: "+91 99999 88888" } });
    fireEvent.change(screen.getByLabelText(/Address Line 1/i), { target: { value: "456 Corporate Towers" } });
    fireEvent.change(screen.getByLabelText(/^City \*/i), { target: { value: "Pune" } });
    fireEvent.change(screen.getByLabelText(/^State \*/i), { target: { value: "Maharashtra" } });
    fireEvent.change(screen.getByLabelText(/Postal Code/i), { target: { value: "411001" } });

    const submitBtn = screen.getByRole("button", { name: /Save Address/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Address added successfully.")).toBeInTheDocument();
      // Verify payload sent in POST call (call #2)
      const postCall = fetchMock.mock.calls.find((call) => String(call[0]).includes("/storefront/addresses") && call[1]?.method === "POST");
      expect(postCall).toBeDefined();
      const body = JSON.parse(postCall![1]?.body as string);
      expect("latitude" in body).toBe(false);
      expect("longitude" in body).toBe(false);
    });
  });

  it("3. Setting default address re-fetches list and trusts server state", async () => {
    vi.mocked(fetch)
      // 1. GET /storefront/addresses (initial)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            { id: 101, recipientName: "Jordan Rivera", isDefault: true, label: "Home", phone: "123", line1: "L1", city: "C", state: "S", postalCode: "P", country: "IN" },
            { id: 102, recipientName: "Alex Smith", isDefault: false, label: "Office", phone: "456", line1: "L2", city: "C", state: "S", postalCode: "P", country: "IN" },
          ],
        }),
      } as any)
      // 2. PATCH /storefront/addresses/102/default
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: 102, isDefault: true } }),
      } as any)
      // 3. GET /storefront/addresses (re-fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            { id: 101, recipientName: "Jordan Rivera", isDefault: false, label: "Home", phone: "123", line1: "L1", city: "C", state: "S", postalCode: "P", country: "IN" },
            { id: 102, recipientName: "Alex Smith", isDefault: true, label: "Office", phone: "456", line1: "L2", city: "C", state: "S", postalCode: "P", country: "IN" },
          ],
        }),
      } as any);

    render(<AddressBookClient />);

    await waitFor(() => {
      expect(screen.getByText("Set as Default")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Set as Default"));

    await waitFor(() => {
      expect(screen.getByText("Default address updated.")).toBeInTheDocument();
    });
  });
});
