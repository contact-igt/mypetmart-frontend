import { getStorefrontProducts } from "@/lib/storefront-api";
import { CustomerFeedbackSlider } from "./customer-feedback-slider";

const TESTIMONIAL_PRODUCT_COUNT = 6;

export function CustomerFeedbackSkeleton() {
  return (
    <section className="section-block bg-peach-hero py-16 sm:py-20">
      <div className="site-container">
        <div className="mb-8 h-24 w-full max-w-lg animate-pulse rounded-2xl bg-white/40" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-[9/16] animate-pulse rounded-[24px] bg-white/40" />
          ))}
        </div>
      </div>
    </section>
  );
}

export async function CustomerFeedback() {
  const { items } = await getStorefrontProducts({
    page: 1,
    pageSize: TESTIMONIAL_PRODUCT_COUNT,
    sort: "newest",
  });

  return <CustomerFeedbackSlider products={items} />;
}
