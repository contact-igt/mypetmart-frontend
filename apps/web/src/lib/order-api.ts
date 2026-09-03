import { fetchBinaryWithAuth, fetchWithAuth, type BinaryDownload } from "./auth/auth-api";
import type {
  CreateOrderInput,
  CreateOrderResultJSON,
  CustomerOrderListQuery,
  CustomerOrderListResult,
  GuestOrderDetailJSON,
  OrderDetailJSON,
} from "@/types/order";

export const OrderApi = {
  /**
   * Creates a pending Order for either guest (session cookie) or customer (Bearer token).
   * For a guest, the result includes a one-time guestAccessToken for recovery.
   */
  async create(input: CreateOrderInput): Promise<CreateOrderResultJSON> {
    return fetchWithAuth<CreateOrderResultJSON>("/storefront/orders", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  /**
   * Retrieves a guest Order by its opaque recovery token. No authentication
   * required or used — the token itself is the sole access credential.
   */
  async getGuestOrder(token: string): Promise<GuestOrderDetailJSON> {
    return fetchWithAuth<GuestOrderDetailJSON>(`/storefront/orders/guest/${encodeURIComponent(token)}`, {
      method: "GET",
    });
  },

  /**
   * Lists orders for an authenticated customer with optional pagination query params.
   */
  async list(query?: CustomerOrderListQuery): Promise<CustomerOrderListResult> {
    const params = new URLSearchParams();
    if (query?.page) params.set("page", String(query.page));
    if (query?.pageSize) params.set("pageSize", String(query.pageSize));
    if (query?.status) params.set("status", query.status);
    if (query?.from) params.set("from", query.from);
    if (query?.to) params.set("to", query.to);
    if (query?.search) params.set("search", query.search);

    const queryString = params.toString();
    const endpoint = queryString ? `/storefront/orders?${queryString}` : "/storefront/orders";

    return fetchWithAuth<CustomerOrderListResult>(endpoint, {
      method: "GET",
    });
  },

  /**
   * Canonical detail helper: Retrieves an Order by ID for an authenticated customer.
   */
  async getOrder(id: number): Promise<OrderDetailJSON> {
    return fetchWithAuth<OrderDetailJSON>(`/storefront/orders/${id}`, {
      method: "GET",
    });
  },

  /**
   * Cancels an authenticated customer's own unfinished pending Order. The
   * backend is the final authority for payment safety and returns the same
   * authoritative detail DTO as getOrder().
   */
  async cancelPendingOrder(id: number): Promise<OrderDetailJSON> {
    return fetchWithAuth<OrderDetailJSON>(`/storefront/orders/${id}/cancel`, {
      method: "POST",
    });
  },

  /**
   * Cancels a guest's unfinished pending Order using its opaque recovery
   * token. The token is encoded as a route segment and is never logged.
   */
  async cancelPendingGuestOrder(token: string): Promise<GuestOrderDetailJSON> {
    return fetchWithAuth<GuestOrderDetailJSON>(`/storefront/orders/guest/${encodeURIComponent(token)}/cancel`, {
      method: "POST",
    });
  },

  /**
   * Downloads the PDF receipt for an authenticated customer's own Order.
   * Ownership is enforced entirely server-side (same guarantee as getOrder).
   */
  async downloadReceipt(id: number): Promise<BinaryDownload> {
    return fetchBinaryWithAuth(`/storefront/orders/${id}/receipt`, {
      method: "GET",
    });
  },

  /**
   * Downloads the PDF receipt for a guest Order via its recovery token — no
   * authentication, the token itself is the sole access credential (same as
   * getGuestOrder).
   */
  async downloadGuestReceipt(token: string): Promise<BinaryDownload> {
    return fetchBinaryWithAuth(`/storefront/orders/guest/${encodeURIComponent(token)}/receipt`, {
      method: "GET",
    });
  },
};
