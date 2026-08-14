import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { ArrowRightIcon } from "@/components/icons";
import { getStorefrontProducts } from "@/lib/storefront-api";
import type { ProductListItem } from "@/types/storefront";

// The storefront product-list endpoint has no `featured` query parameter, so this
// fetches an ordinary "newest" page and then prefers items whose real `featured`
// flag (returned on every ProductListItem) is set, filling any remaining slots
// with the next-newest items. No unsupported backend filter is invented.
const HOME_FEATURED_PRODUCT_COUNT = 6;
const HOME_FEATURED_FETCH_POOL_SIZE = 12;

async function getHomeFeaturedProducts(): Promise<ProductListItem[]> {
  const { items } = await getStorefrontProducts({
    page: 1,
    pageSize: HOME_FEATURED_FETCH_POOL_SIZE,
    sort: "newest",
  });

  const featured = items.filter((item) => item.featured);
  const rest = items.filter((item) => !item.featured);
  return [...featured, ...rest].slice(0, HOME_FEATURED_PRODUCT_COUNT);
}

function SectionHeader() {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <span className="pill-label bg-mint-sage text-text-primary">Tail-wagging favourites</span>
        <h2 className="display-heading mt-4 text-3xl text-text-primary sm:text-4xl">
          Loved by
          <span className="accent">pet parents.</span>
        </h2>
      </div>
      <Link href="/shop" className="button-secondary">
        See all products <ArrowRightIcon width={16} height={16} />
      </Link>
    </div>
  );
}

export function FeaturedProductsSkeleton() {
  return (
    <section className="section-block bg-cream-bg">
      <div className="site-container">
        <SectionHeader />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-[26px] bg-[#FFF8EF] border border-[#E7CFB9]/40 h-[360px] flex flex-col overflow-hidden"
            >
              <div className="bg-[#FFF8EF]/50 aspect-[4/5] w-full" />
              <div className="p-5 flex-1 bg-white/40 flex flex-col justify-between">
                <div className="h-5 bg-border-subtle rounded-md w-3/4" />
                <div className="h-5 bg-border-subtle rounded-md w-1/4 mt-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export async function FeaturedProducts() {
  let products: ProductListItem[] = [];
  let failed = false;

  try {
    products = await getHomeFeaturedProducts();
  } catch {
    // A failed fetch here must never take down the rest of the Home page.
    failed = true;
  }

  return (
    <section className="section-block bg-cream-bg">
      <div className="site-container">
        <SectionHeader />

        {failed ? (
          <p className="text-text-primary/70">
            We couldn&apos;t load products right now.{" "}
            <Link href="/shop" className="underline">
              Browse the shop
            </Link>{" "}
            instead.
          </p>
        ) : products.length === 0 ? (
          <p className="text-text-primary/70">
            New products are on their way.{" "}
            <Link href="/shop" className="underline">
              Browse the shop
            </Link>{" "}
            in the meantime.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
