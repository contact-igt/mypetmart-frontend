"use client";

import { useState } from "react";
import { BestSellersSection, BestSellersSkeleton, HOME_FEATURED_FETCH_POOL_SIZE, HOME_FEATURED_PRODUCT_COUNT } from "./best-sellers-section";
import { getStorefrontProducts } from "@/lib/storefront-api";
import type { ProductListItem } from "@/types/storefront";

type Phase = { status: "error" } | { status: "retrying" } | { status: "loaded"; products: ProductListItem[] };

/**
 * Client-side error/retry state for the homepage's Featured Products
 * section — mounted only when the server-side fetch in featured-products.tsx
 * already failed once. Reuses the exact same query and the same
 * warm-card/button-primary error pattern already proven on the Shop page.
 */
export function FeaturedProductsRetry() {
  const [phase, setPhase] = useState<Phase>({ status: "error" });

  async function handleRetry() {
    setPhase({ status: "retrying" });
    try {
      const { items } = await getStorefrontProducts({
        page: 1,
        pageSize: HOME_FEATURED_FETCH_POOL_SIZE,
        sort: "newest",
      });
      const featured = items.filter((item) => item.featured);
      const rest = items.filter((item) => !item.featured);
      setPhase({ status: "loaded", products: [...featured, ...rest].slice(0, HOME_FEATURED_PRODUCT_COUNT) });
    } catch (error) {
      console.error("Homepage featured products retry failed", error);
      setPhase({ status: "error" });
    }
  }

  if (phase.status === "retrying") {
    return <BestSellersSkeleton />;
  }

  if (phase.status === "loaded") {
    return <BestSellersSection products={phase.products} />;
  }

  return (
    <section className="section-block bg-cream-bg py-14 sm:py-16">
      <div className="site-container">
        <div className="warm-card text-center py-12 border border-[#E7CFB9] rounded-[26px]">
          <p className="body-copy font-semibold text-terracotta">Unable to load products. Please try again.</p>
          <button type="button" onClick={handleRetry} className="button-primary mt-4 inline-flex cursor-pointer">
            Retry
          </button>
        </div>
      </div>
    </section>
  );
}
