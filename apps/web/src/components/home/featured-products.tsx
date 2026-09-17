import { BestSellersSection, BestSellersSkeleton, HOME_FEATURED_FETCH_POOL_SIZE, HOME_FEATURED_PRODUCT_COUNT } from "./best-sellers-section";
import { FeaturedProductsRetry } from "./featured-products-retry";
import { getStorefrontProducts } from "@/lib/storefront-api";
import type { ProductListItem } from "@/types/storefront";

async function getHomeFeaturedProducts(): Promise<ProductListItem[]> {
  const { items } = await getStorefrontProducts({
    page: 1,
    pageSize: HOME_FEATURED_FETCH_POOL_SIZE,
    sort: "recommended",
  });

  return items.slice(0, HOME_FEATURED_PRODUCT_COUNT);
}

export function FeaturedProductsSkeleton() {
  return <BestSellersSkeleton />;
}

export async function FeaturedProducts() {
  let products: ProductListItem[] = [];
  let failed = false;

  try {
    products = await getHomeFeaturedProducts();
  } catch (error) {
    failed = true;
    console.error("Homepage featured products request failed", error);
  }

  if (failed) return <FeaturedProductsRetry />;

  return <BestSellersSection products={products} />;
}
