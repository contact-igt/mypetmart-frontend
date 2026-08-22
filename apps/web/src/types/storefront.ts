export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  petType: "dog" | "cat" | "all";
  displayOrder: number;
  imageUrl: string | null;
  imageAlt: string | null;
}

export interface ProductCategoryRef {
  id: number;
  name: string;
  slug: string;
  petType: "dog" | "cat" | "all";
}

export interface ProductImage {
  id: number;
  url: string;
  alt: string;
  contentType: string;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface ProductListItem {
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
  category: ProductCategoryRef;
  primaryImage: ProductImage | null;
}

export interface PaginatedProductList {
  items: ProductListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type ProductSort = "newest" | "price_asc" | "price_desc" | "name";

export interface ProductListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  petType?: "dog" | "cat" | "all";
  sort?: ProductSort;
  featured?: boolean;
}

export interface ProductVariant {
  id: number;
  productId: number;
  name: string;
  sku: string;
  price: string;
  compareAtPrice: string | null;
  stock: number;
  active: boolean;
  displayOrder: number;
  weightGrams: number | null;
  lengthCm: string | null;
  widthCm: string | null;
  heightCm: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductDetail {
  id: number;
  name: string;
  slug: string;
  sku: string;
  brand: string | null;
  description: string | null;
  petType: "dog" | "cat" | "all";
  price: string;
  compareAtPrice: string | null;
  stock: number;
  hasVariants: boolean;
  featured: boolean;
  inStock: boolean;
  category: ProductCategoryRef;
  primaryImage: ProductImage | null;
  tags: string[];
  metaTitle: string | null;
  metaDescription: string | null;
  weightGrams: number | null;
  lengthCm: string | null;
  widthCm: string | null;
  heightCm: string | null;
  variants: ProductVariant[];
  images: ProductImage[];
}

export type CartAvailabilityReason =
  | "OUT_OF_STOCK"
  | "PRODUCT_UNAVAILABLE"
  | "VARIANT_UNAVAILABLE";

export interface CartItemImage {
  url: string;
  alt: string | null;
}

export interface CartItem {
  cartItemId: number;
  productId: number;
  variantId: number | null;
  productName: string;
  productSlug: string;
  productType: "simple" | "variant";
  sku: string;
  variantName: string | null;
  image: CartItemImage | null;
  price: string;
  compareAtPrice: string | null;
  quantity: number;
  subtotal: string;
  available: boolean;
  availabilityReason: CartAvailabilityReason | null;
  availableQuantity: number;
}

export interface Cart {
  id: number | null;
  status: "active" | "ordered" | "abandoned";
  itemCount: number;
  subtotal: string;
  items: CartItem[];
}

export interface AddCartItemInput {
  productId: number;
  variantId?: number;
  quantity: number;
}

export interface UpdateCartItemInput {
  quantity: number;
}

export interface CartMergeLineReport {
  productId: number;
  variantId: number | null;
  requestedQuantity: number;
  finalQuantity: number;
}

export interface CartMergeSkippedLine {
  productId: number;
  variantId: number | null;
  requestedQuantity: number;
}

export interface CartMergeReport {
  mergedItems: CartMergeLineReport[];
  adjustedItems: CartMergeLineReport[];
  skippedItems: CartMergeSkippedLine[];
}

export interface CartMergeResult {
  cart: Cart;
  mergeReport: CartMergeReport;
}


