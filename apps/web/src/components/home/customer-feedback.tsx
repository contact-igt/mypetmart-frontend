import { getStorefrontTestimonials } from "@/lib/storefront-api";
import { TestimonialCarousel } from "@/components/testimonials/testimonial-carousel";

export function CustomerFeedbackSkeleton() {
  return (
    <section className="section-block bg-peach-hero py-16 sm:py-20">
      <div className="site-container">
        <div className="mb-8 h-24 w-full max-w-lg animate-pulse rounded-2xl bg-white/40" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-white/40" />)}
        </div>
      </div>
    </section>
  );
}

export async function CustomerFeedback() {
  let testimonials = [] as Awaited<ReturnType<typeof getStorefrontTestimonials>>["testimonials"];
  try {
    const result = await getStorefrontTestimonials();
    testimonials = result.testimonials ?? [];
  } catch {
    testimonials = [];
  }
  return <TestimonialCarousel testimonials={testimonials} title="Pet parent favourites" description="Things pets love. Things pet parents keep coming back for." />;
}
