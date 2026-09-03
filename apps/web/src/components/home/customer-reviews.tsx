import { CustomerReviewsClient } from "./customer-reviews-client";

export function CustomerReviewsSkeleton() {
  return (
    <section className="section-block bg-cream-bg py-14 sm:py-16">
      <div className="site-container">
        <div className="h-28 max-w-xl animate-pulse rounded-2xl bg-surface-secondary/40" />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => <div key={item} className="h-[22rem] animate-pulse rounded-2xl bg-white" />)}
        </div>
      </div>
    </section>
  );
}

export function CustomerReviews() {
  return <CustomerReviewsClient productId={null} />;
}
