"use client";

import { useState } from "react";
import type { ProductFaq } from "@/types/storefront";

// Renders FAQ text as plain text only — never HTML — per the same no-fake-data,
// no-unsafe-rendering rule already applied to reviews/specifications.
export function PdpFaqAccordion({ faqs }: { faqs: ProductFaq[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (faqs.length === 0) return null;

  return (
    <section className="mt-16 border-t border-border-subtle pt-12" aria-labelledby="product-faq-heading">
      <div className="mb-7 max-w-2xl">
        <span className="pill-label bg-white text-text-primary">FAQs</span>
        <h2 id="product-faq-heading" className="mt-4 text-3xl font-medium text-text-primary sm:text-4xl" style={{ fontFamily: "var(--font-display-italic)" }}>
          Questions pet parents ask.
        </h2>
      </div>

      <div className="flex flex-col gap-3">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div key={faq.question} className="rounded-[18px] border border-border-subtle bg-white">
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${index}`}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-text-primary"
              >
                {faq.question}
                <span aria-hidden="true" className={`shrink-0 text-lg text-text-muted transition-transform duration-150 ${isOpen ? "rotate-45" : ""}`}>
                  +
                </span>
              </button>
              {isOpen && (
                <div id={`faq-answer-${index}`} className="px-5 pb-4 text-sm leading-relaxed text-text-muted whitespace-pre-line">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
