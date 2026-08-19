import type { ProductCategoryRef, ProductImage } from "./storefront";

export interface WishlistProductSummary {
  id: number;
  name: string;
  slug: string;
  brand: string | null;
  petType: "dog" | "cat" | "all";
  price: string;
  compareAtPrice: string | null;
  stock: number;
  hasVariants: boolean;
  featured: boolean;
  inStock: boolean;
  available: boolean;
  category: ProductCategoryRef;
  primaryImage: ProductImage | null;
}

export interface WishlistItem {
  wishlistItemId: number;
  createdAt: string;
  product: WishlistProductSummary;
}

export interface Wishlist {
  items: WishlistItem[];
}
