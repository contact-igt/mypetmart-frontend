import { fetchWithAuth } from "./auth/auth-api";
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
};

