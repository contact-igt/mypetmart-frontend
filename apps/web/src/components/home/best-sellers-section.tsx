import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import type { ProductListItem } from "@/types/storefront";
import { FeaturedProductCard } from "./featured-product-card";

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

function FullRangeCard() {
  return (
    <Link
      href="/shop"
      className="group flex min-h-[31rem] h-full flex-col items-center justify-center rounded-[24px] border border-dashed border-deep-brown/20 bg-white/20 px-7 text-center transition-colors duration-150 hover:bg-white/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30"
    >
      <p className="max-w-[12rem] text-2xl font-bold leading-[1.12] text-text-primary/70 sm:text-[1.7rem]">See the full range</p>
      <p className="mt-4 max-w-[12.5rem] text-sm font-medium leading-[1.45] text-text-primary/60 sm:text-base">
        Explore the complete My Pet Mart collection.
      </p>
      <span className="mt-7 text-2xl leading-none text-terracotta transition-transform duration-150 group-hover:translate-x-1" aria-hidden="true">
        <ArrowRightIcon width={24} height={24} />
      </span>
    </Link>
  );
}

export function BestSellersSkeleton() {
  return (
    <section className="section-block bg-cream-bg py-14 sm:py-16">
      <div className="site-container">
        <SectionHeader />
        <div className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="min-h-[31rem] animate-pulse rounded-[24px] border border-deep-brown/10 bg-white/45" />
          ))}
        </div>
      </div>
    </section>
  );
}

export function BestSellersSection({ products }: { products: ProductListItem[] }) {
  if (products.length === 0) return null;

  return (
    <section className="section-block bg-cream-bg py-14 sm:py-16" aria-labelledby="best-sellers-heading">
      <div className="site-container">
        <SectionHeader />
        <div className="mt-7 grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 lg:grid-cols-4" aria-label="Best sellers product grid">
          {products.map((product) => <FeaturedProductCard key={product.id} product={product} />)}
          <FullRangeCard />
        </div>
      </div>
    </section>
  );
}
