import { fetchWithAuth } from "./auth/auth-api";
import type {
  CreateReviewInput,
  OwnReviewJSON,
  PublicReviewListResult,
  StorefrontReviewFeedResult,
  ReviewEligibilityJSON,
  ReviewListSort,
  UpdateReviewInput,
} from "@/types/review";

export const ReviewApi = {
  async listGlobal(query?: { page?: number; pageSize?: number; sort?: ReviewListSort }): Promise<StorefrontReviewFeedResult> {
    const params = new URLSearchParams();
    if (query?.page) params.set("page", String(query.page));
    if (query?.pageSize) params.set("pageSize", String(query.pageSize));
    if (query?.sort) params.set("sort", query.sort);
    const queryString = params.toString();
    return fetchWithAuth<StorefrontReviewFeedResult>(`/storefront/reviews${queryString ? `?${queryString}` : ""}`, { method: "GET" });
  },
  // Public — no auth required. Returns approved Reviews + the rating summary
  // in one round trip (see backend review.service.ts).
  async list(productId: number, query?: { page?: number; pageSize?: number; sort?: ReviewListSort }): Promise<PublicReviewListResult> {
    const params = new URLSearchParams();
    if (query?.page) params.set("page", String(query.page));
    if (query?.pageSize) params.set("pageSize", String(query.pageSize));
    if (query?.sort) params.set("sort", query.sort);
    const queryString = params.toString();
    const endpoint = `/storefront/products/${productId}/reviews${queryString ? `?${queryString}` : ""}`;
    return fetchWithAuth<PublicReviewListResult>(endpoint, { method: "GET" });
  },

  // Deliberately safe for an unauthenticated visitor — never throws/401s.
  async getEligibility(productId: number): Promise<ReviewEligibilityJSON> {
    return fetchWithAuth<ReviewEligibilityJSON>(`/storefront/products/${productId}/review-eligibility`, { method: "GET" });
  },

  async create(productId: number, input: CreateReviewInput): Promise<OwnReviewJSON> {
    return fetchWithAuth<OwnReviewJSON>(`/storefront/products/${productId}/reviews`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async updateOwn(productId: number, input: UpdateReviewInput): Promise<OwnReviewJSON> {
    return fetchWithAuth<OwnReviewJSON>(`/storefront/products/${productId}/reviews/me`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },
};
