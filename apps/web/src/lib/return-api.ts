import { fetchWithAuth } from "./auth/auth-api";
import type { CreateReturnRequestInput, ListReturnsResultJSON, ReturnRequestDetailJSON } from "@/types/return";

export const ReturnApi = {
  async create(input: CreateReturnRequestInput): Promise<ReturnRequestDetailJSON> {
    return fetchWithAuth<ReturnRequestDetailJSON>("/storefront/returns", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async list(query?: { page?: number; pageSize?: number }): Promise<ListReturnsResultJSON> {
    const params = new URLSearchParams();
    if (query?.page) params.set("page", String(query.page));
    if (query?.pageSize) params.set("pageSize", String(query.pageSize));
    const queryString = params.toString();
    const endpoint = queryString ? `/storefront/returns?${queryString}` : "/storefront/returns";
    return fetchWithAuth<ListReturnsResultJSON>(endpoint, { method: "GET" });
  },

  async getReturn(id: number): Promise<ReturnRequestDetailJSON> {
    return fetchWithAuth<ReturnRequestDetailJSON>(`/storefront/returns/${id}`, { method: "GET" });
  },
};
