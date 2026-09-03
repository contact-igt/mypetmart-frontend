import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import type { ProductListItem } from "@/types/storefront";
import { BestSellersCarousel } from "./best-sellers-carousel";

export const HOME_FEATURED_PRODUCT_COUNT = 8;
export const HOME_FEATURED_FETCH_POOL_SIZE = 12;

function SectionHeader() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-terracotta">Best sellers</p>
        <h2
          id="best-sellers-heading"
          className="mt-3 text-[2.45rem] leading-[1.05] text-text-primary sm:text-[3.25rem]"
          style={{ fontFamily: "var(--font-bagel-fat-one)", fontWeight: 400 }}
        >
          Pet parent favourites
        </h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-text-primary/75 sm:text-lg">
          Things pets love. Things pet parents keep coming back for.
        </p>
      </div>
      <Link href="/shop" className="mb-1 inline-flex items-center gap-2 pb-1 text-base font-semibold text-terracotta transition-colors duration-150 hover:text-deep-brown">
        See all products <ArrowRightIcon width={16} height={16} />
      </Link>
    </div>
  );
}

export function BestSellersSkeleton() {
  return (
    <section className="section-block bg-cream-bg py-14 sm:py-16">
      <div className="site-container">
        <SectionHeader />
        <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="min-h-[30rem] animate-pulse rounded-[24px] border border-deep-brown/10 bg-white/45" />
          ))}
        </div>
      </div>
    </section>
  );
}

export function BestSellersSection({ products }: { products: ProductListItem[] }) {
  return (
    <section className="section-block bg-cream-bg py-14 sm:py-16" aria-labelledby="best-sellers-heading">
      <div className="site-container">
        <SectionHeader />
        {products.length > 0 ? (
          <BestSellersCarousel products={products} />
        ) : (
          <div className="mt-8 rounded-[24px] border border-deep-brown/10 bg-white px-6 py-8 text-center sm:px-8">
            <p className="text-base font-medium text-text-primary/70">New products are coming soon.</p>
            <Link href="/shop" className="button-primary mt-4 inline-flex h-11 text-sm">
              Browse the shop
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
