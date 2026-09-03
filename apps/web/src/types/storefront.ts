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
  description?: string | null;
  petType: "dog" | "cat" | "all";
  price: string;
  compareAtPrice: string | null;
  stock: number;
  hasVariants: boolean;
  featured: boolean;
  inStock: boolean;
  category: ProductCategoryRef;
  primaryImage: ProductImage | null;
  averageRating: number;
  reviewCount: number;
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

export interface ProductFeature {
  id: number;
  productId: number;
  label: string;
  displayOrder: number;
}

export interface ProductSpecification {
  label: string;
  value: string;
  displayOrder: number;
}

export type ProductContentLayout = "media_left" | "media_right" | "media_full";

export interface ProductContentBlock {
  heading: string | null;
  description: string | null;
  layout: ProductContentLayout;
  displayOrder: number;
  media: {
    publicUrl: string;
    mediaType: "image" | "video";
    mimeType: string;
    title: string | null;
  } | null;
}

export type ProductMediaRole = "product_video" | "testimonial_video";

export interface ProductMediaAssignment {
  id: number;
  mediaAssetId: number;
  mediaRole: ProductMediaRole;
  title: string | null;
  caption: string | null;
  displayOrder: number;
  active: boolean;
  media: {
    id: number;
    publicUrl: string;
    mimeType: string;
    mediaType: "image" | "video";
    title: string | null;
    originalName: string;
  };
}

export interface StorefrontProductSummary {
  id: number;
  name: string;
  slug: string;
  image: string | null;
}

export interface StorefrontTestimonial {
  id: number;
  videoUrl: string;
  title: string | null;
  caption: string | null;
  product: StorefrontProductSummary;
}

export interface StorefrontTestimonialsResult {
  testimonials: StorefrontTestimonial[];
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

export interface ProductFaq {
  question: string;
  answer: string;
  displayOrder: number;
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
  howToUse: string | null;
  careInstructions: string | null;
  safetyInfo: string | null;
  variants: ProductVariant[];
  images: ProductImage[];
  features: ProductFeature[];
  specifications: ProductSpecification[];
  contentBlocks: ProductContentBlock[];
  productVideos: ProductMediaAssignment[];
  testimonialVideos: ProductMediaAssignment[];
  relatedProducts: ProductListItem[];
  faqs: ProductFaq[];
}

// Result of the Product Detail "check delivery to your pincode" pre-purchase
// serviceability check. `serviceable: false` is a valid pincode we cannot
// deliver to; a technical failure surfaces as a thrown error instead, never
// as this shape. `estimatedDelivery` holds the iThink Rate API's exact
// calendar-date window (or null when unavailable); `deliveryCharge` is the
// existing V1 storefront shipping rule (free), never a raw courier rate.
export interface DeliveryCheckResult {
  pincode: string;
  serviceable: boolean;
  estimatedDelivery: { min: string; max: string } | null;
  deliveryCharge: { free: boolean; amount: string; currency: string } | null;
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

// Public-safe subset of the backend's admin-managed StoreProfile
// (mypetmart-backend/src/models/SettingsModels/settings.types.ts) — only the
// 4 fields the storefront is allowed to display, served by
// GET /storefront/store-profile.
export interface StoreProfile {
  storeName: string;
  supportEmail: string;
  supportPhone: string;
  address: string;
}


