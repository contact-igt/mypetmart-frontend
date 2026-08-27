export type ReviewStatus = "pending" | "approved" | "rejected";
export type ReviewSource = "customer" | "admin";

export interface PublicReviewJSON {
  id: number;
  rating: number;
  title: string | null;
  review: string;
  customerName?: string | null;
  // Kept optional so older cached storefront responses keep rendering safely.
  customerDisplayName?: string;
  verifiedPurchase: boolean;
  reviewSource?: ReviewSource;
  createdAt: string;
}

export function getReviewCustomerName(review: PublicReviewJSON): string {
  return review.customerName?.trim() || review.customerDisplayName?.trim() || "Customer";
}

export interface ReviewRatingDistribution {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}

export interface ReviewSummaryJSON {
  averageRating: number;
  reviewCount: number;
  distribution: ReviewRatingDistribution;
}

export interface PublicReviewListResult {
  items: PublicReviewJSON[];
  page: number;
  pageSize: number;
  total: number;
  summary: ReviewSummaryJSON;
}

export interface OwnReviewJSON {
  id: number;
  productId: number;
  rating: number;
  title: string | null;
  review: string;
  status: ReviewStatus;
  verifiedPurchase: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewEligibilityJSON {
  authenticated: boolean;
  eligible: boolean;
  hasReview: boolean;
  reviewStatus?: ReviewStatus;
  review?: OwnReviewJSON;
}

export interface CreateReviewInput {
  rating: number;
  title?: string | null;
  review: string;
}

export type UpdateReviewInput = Partial<CreateReviewInput>;

export type ReviewListSort = "newest" | "highest" | "lowest";
