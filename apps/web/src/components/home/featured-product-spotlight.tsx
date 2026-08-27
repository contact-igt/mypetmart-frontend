import Link from "next/link";
import { FeaturedProductSpotlightClient } from "./featured-product-spotlight-client";
import { getStorefrontProductBySlug, getStorefrontProducts } from "@/lib/storefront-api";
import type { ProductDetail } from "@/types/storefront";

async function getFeaturedGroomingProduct(): Promise<ProductDetail | null> {
  const { items } = await getStorefrontProducts({
    page: 1,
    pageSize: 1,
    category: "grooming",
    featured: true,
    sort: "newest",
  });

  const product = items[0];
  return product ? getStorefrontProductBySlug(product.slug) : null;
}

function SpotlightFallback() {
  return (
    <section className="section-block bg-cream-bg py-14 sm:py-16">
      <div className="site-container rounded-[28px] border border-deep-brown/15 bg-white px-7 py-12 text-center sm:px-10">
        <p className="text-sm font-bold uppercase tracking-[0.1em] text-terracotta">Featured product</p>
        <h2 className="mt-3 text-3xl text-text-primary" style={{ fontFamily: "var(--font-bagel-fat-one)", fontWeight: 400 }}>
          Discover pet-care essentials
        </h2>
        <p className="mt-3 text-text-primary/70">Explore the latest products in our shop.</p>
        <Link href="/shop" className="button-primary mt-6 h-12 text-sm">Browse the shop</Link>
      </div>
    </section>
  );
}

export function FeaturedProductSpotlightSkeleton() {
  return (
    <section className="section-block bg-cream-bg py-14 sm:py-16">
      <div className="site-container grid overflow-hidden rounded-[28px] border border-deep-brown/10 bg-white lg:grid-cols-2">
        <div className="min-h-[22rem] animate-pulse bg-surface-secondary/40 sm:min-h-[32rem]" />
        <div className="min-h-[28rem] animate-pulse bg-white/70" />
      </div>
    </section>
  );
}

export async function FeaturedProductSpotlight() {
  let product: ProductDetail | null = null;

  try {
    product = await getFeaturedGroomingProduct();
  } catch {
    product = null;
  }

  return product ? <FeaturedProductSpotlightClient product={product} /> : <SpotlightFallback />;
}
