import { getStorefrontProducts } from "@/lib/storefront-api";
import { CustomerReviewsClient } from "./customer-reviews-client";

async function getReviewProductId(): Promise<number | null> {
  const { items } = await getStorefrontProducts({
    page: 1,
    pageSize: 1,
    category: "grooming",
    featured: true,
    sort: "newest",
  });

  return items[0]?.id ?? null;
}

export function CustomerReviewsSkeleton() {
  return (
    <section className="section-block bg-cream-bg py-14 sm:py-16">
      <div className="site-container">
        <div className="h-28 max-w-xl animate-pulse rounded-2xl bg-surface-secondary/40" />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-80 animate-pulse rounded-[20px] bg-white" />
          ))}
        </div>
      </div>
    </section>
  );
}

export async function CustomerReviews() {
  let productId: number | null = null;

  try {
    productId = await getReviewProductId();
  } catch {
    productId = null;
  }

  return <CustomerReviewsClient productId={productId} />;
}
