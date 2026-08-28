"use client";

import { useState } from "react";
import { ShopByPetSection } from "./shop-by-pet-section";
import { CategoryGridSkeleton } from "./category-grid";
import { getStorefrontCategories } from "@/lib/storefront-api";
import type { Category } from "@/types/storefront";

type Phase = { status: "error" } | { status: "retrying" } | { status: "loaded"; categories: Category[] };

/**
 * Client-side error/retry state for the homepage's Shop by Pet section —
 * mounted only when the server-side fetch in category-grid.tsx already
 * failed once. Reuses the exact same getStorefrontCategories call and the
 * same warm-card/button-primary error pattern already proven on the Shop
 * page (shop-explorer.tsx), so a failure here reads consistently with the
 * rest of the storefront rather than introducing a new error style.
 */
export function CategoryGridRetry() {
  const [phase, setPhase] = useState<Phase>({ status: "error" });

  async function handleRetry() {
    setPhase({ status: "retrying" });
    try {
      const categories = await getStorefrontCategories(undefined, { showOnHomepage: true });
      setPhase({ status: "loaded", categories });
    } catch {
      setPhase({ status: "error" });
    }
  }

  if (phase.status === "retrying") {
    return <CategoryGridSkeleton />;
  }

  if (phase.status === "loaded") {
    // A retry that succeeds but finds zero categories is the same
    // legitimate empty state category-grid.tsx already treats as "nothing
    // to show" — not an error, so it stays silent rather than fabricating
    // placeholder categories.
    if (phase.categories.length === 0) return null;
    return <ShopByPetSection categories={phase.categories} />;
  }

  return (
    <section className="section-block bg-cream-bg py-14 sm:py-16">
      <div className="site-container">
        <div className="warm-card text-center py-12 border border-[#E7CFB9] rounded-[26px]">
          <p className="body-copy font-semibold text-terracotta">Unable to load categories. Please try again.</p>
          <button type="button" onClick={handleRetry} className="button-primary mt-4 inline-flex cursor-pointer">
            Retry
          </button>
        </div>
      </div>
    </section>
  );
}
