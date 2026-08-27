import { Check } from "lucide-react";
import type { ProductFeature } from "@/types/storefront";

const SURFACES = ["bg-[#F6D3A9]/55", "bg-mint-sage/65", "bg-[#FFD96A]/55"];

export function PdpFeaturesGrid({ features }: { features: ProductFeature[] }) {
  if (features.length === 0) return null;

  return (
    <section className="mt-20 sm:mt-24" aria-labelledby="product-features-heading">
      <div className="mb-7 flex flex-col gap-3 sm:mb-9 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <span className="pill-label border border-deep-brown/10 bg-white text-text-primary">Highlights</span>
          <h2
            id="product-features-heading"
            className="mt-4 text-3xl font-medium leading-tight text-text-primary sm:text-4xl"
            style={{ fontFamily: "var(--font-display-italic)" }}
          >
            Key Features
          </h2>
        </div>
        <p className="text-sm font-semibold text-text-muted">
          {features.length} product highlight{features.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => (
          <article
            key={feature.id}
            className={`${SURFACES[index % SURFACES.length]} group flex min-h-32 items-start gap-4 rounded-[22px] border border-deep-brown/10 p-5 transition-transform duration-200 hover:-translate-y-0.5 sm:p-6`}
          >
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-primary-orange shadow-sm" aria-hidden="true">
              <Check size={18} strokeWidth={2.4} />
            </span>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-primary/45">
                Highlight {String(index + 1).padStart(2, "0")}
              </span>
              <p className="mt-2 text-base font-bold leading-snug text-text-primary">{feature.label}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
