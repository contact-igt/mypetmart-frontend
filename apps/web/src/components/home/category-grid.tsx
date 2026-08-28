import { ShopByPetSection } from "./shop-by-pet-section";
import { CategoryGridRetry } from "./category-grid-retry";
import { getStorefrontCategories } from "@/lib/storefront-api";
import type { Category } from "@/types/storefront";

export function CategoryGridSkeleton() {
  return (
    <section className="section-block bg-cream-bg py-14 sm:py-16">
      <div className="site-container">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.1em] text-terracotta">Shop by pet</p>
          <h2 className="mt-3 text-[2.4rem] leading-[1] tracking-[-0.04em] text-text-primary sm:text-[3.1rem]" style={{ fontFamily: "var(--font-bagel-fat-one)", fontWeight: 400 }}>
            Who are you shopping for?
          </h2>
        </div>
        <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
          <div className="aspect-[1.55] animate-pulse rounded-[24px] bg-surface-secondary/35" />
          <div className="aspect-[1.55] animate-pulse rounded-[24px] bg-surface-secondary/35" />
        </div>
      </div>
    </section>
  );
}

export async function CategoryGrid() {
  let categories: Category[] = [];
  let failed = false;

  try {
    categories = await getStorefrontCategories(undefined, { showOnHomepage: true });
  } catch {
    failed = true;
  }

  if (failed) return <CategoryGridRetry />;
  if (categories.length === 0) return null;

  return <ShopByPetSection categories={categories} />;
}
