"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { ProductDetail, ProductVariant } from "@/types/storefront";

type TabKey = "overview" | "specifications" | "usage" | "safety";

export function PdpInfoTabs({ product, selectedVariant }: { product: ProductDetail; selectedVariant: ProductVariant | null }) {
  const sku = selectedVariant ? selectedVariant.sku : product.sku;
  const weightGrams = selectedVariant ? selectedVariant.weightGrams : product.weightGrams;
  const hasDimensions = selectedVariant
    ? selectedVariant.lengthCm && selectedVariant.widthCm && selectedVariant.heightCm
    : product.lengthCm && product.widthCm && product.heightCm;
  const lengthCm = selectedVariant ? selectedVariant.lengthCm : product.lengthCm;
  const widthCm = selectedVariant ? selectedVariant.widthCm : product.widthCm;
  const heightCm = selectedVariant ? selectedVariant.heightCm : product.heightCm;
  const hasUsageOrCare = Boolean(product.howToUse || product.careInstructions);

  const tabs: Array<{ key: TabKey; label: string; available: boolean }> = [
    { key: "overview", label: "Overview", available: Boolean(product.description) },
    { key: "specifications", label: "Specifications", available: true },
    { key: "usage", label: "Usage & Care", available: hasUsageOrCare },
    { key: "safety", label: "Safety", available: Boolean(product.safetyInfo) },
  ];
  const availableTabs = tabs.filter((tab) => tab.available);
  const [activeTab, setActiveTab] = useState<TabKey>(availableTabs[0]?.key ?? "specifications");

  if (availableTabs.length === 0) return null;

  return (
    <section className="mt-20 sm:mt-24" aria-labelledby="product-details-heading">
      <div className="mb-7 max-w-2xl sm:mb-9">
        <span className="pill-label border border-deep-brown/10 bg-white text-text-primary">Product Details</span>
        <h2
          id="product-details-heading"
          className="mt-4 text-3xl font-medium leading-tight text-text-primary sm:text-4xl"
          style={{ fontFamily: "var(--font-display-italic)" }}
        >
          Everything you need to know.
        </h2>
      </div>

      <div className="overflow-hidden rounded-[26px] border border-deep-brown/15 bg-white shadow-[0_12px_35px_rgba(62,35,25,0.05)] lg:grid lg:grid-cols-[270px_minmax(0,1fr)]">
        <div
          role="tablist"
          aria-label="Product details"
          className="scrollbar-none flex gap-2 overflow-x-auto border-b border-deep-brown/10 bg-surface-secondary/20 p-3 lg:flex-col lg:border-b-0 lg:border-r lg:p-5"
        >
          {availableTabs.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`pdp-tabpanel-${tab.key}`}
                id={`pdp-tab-${tab.key}`}
                onClick={() => setActiveTab(tab.key)}
                className={`group inline-flex min-h-12 shrink-0 cursor-pointer items-center justify-between gap-5 rounded-xl px-4 py-3 text-left text-sm font-bold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30 ${
                  isActive
                    ? "bg-deep-brown text-white shadow-sm"
                    : "text-text-primary/65 hover:bg-white hover:text-text-primary"
                }`}
              >
                {tab.label}
                <ArrowRight
                  size={16}
                  strokeWidth={2}
                  className={`${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-60"} hidden transition-opacity lg:block`}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>

        <div className="min-h-[260px] p-6 sm:p-8 lg:p-10 xl:p-12">
          {availableTabs.map((tab) => (
            <div
              key={tab.key}
              id={`pdp-tabpanel-${tab.key}`}
              role="tabpanel"
              aria-labelledby={`pdp-tab-${tab.key}`}
              hidden={tab.key !== activeTab}
            >
              {tab.key === "overview" && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-terracotta">Description</h3>
                  <div className="mt-4 max-w-3xl whitespace-pre-line text-[15px] leading-7 text-text-primary/70">
                    {product.description}
                  </div>
                </div>
              )}

              {tab.key === "specifications" && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-terracotta">Specifications</h3>
                  <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-deep-brown/10 bg-cream-bg/65 p-4">
                      <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-text-muted">SKU:</dt>
                      <dd className="mt-1 text-sm font-bold text-text-primary">{sku}</dd>
                    </div>
                    {weightGrams && (
                      <div className="rounded-xl border border-deep-brown/10 bg-cream-bg/65 p-4">
                        <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-text-muted">Weight:</dt>
                        <dd className="mt-1 text-sm font-bold text-text-primary">{weightGrams}g</dd>
                      </div>
                    )}
                    {hasDimensions && (
                      <div className="rounded-xl border border-deep-brown/10 bg-cream-bg/65 p-4 sm:col-span-2">
                        <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-text-muted">Dimensions (L x W x H):</dt>
                        <dd className="mt-1 text-sm font-bold text-text-primary">
                          {lengthCm} × {widthCm} × {heightCm} cm
                        </dd>
                      </div>
                    )}
                    {product.specifications.map((spec) => (
                      <div key={spec.label} className="rounded-xl border border-deep-brown/10 bg-cream-bg/65 p-4">
                        <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-text-muted">{spec.label}:</dt>
                        <dd className="mt-1 text-sm font-bold text-text-primary">{spec.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {tab.key === "usage" && (
                <div className="grid gap-7 lg:grid-cols-2">
                  {product.howToUse && (
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-terracotta">How to Use</h3>
                      <div className="mt-4 whitespace-pre-line text-[15px] leading-7 text-text-primary/70">{product.howToUse}</div>
                    </div>
                  )}
                  {product.careInstructions && (
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-terracotta">Care Instructions</h3>
                      <div className="mt-4 whitespace-pre-line text-[15px] leading-7 text-text-primary/70">{product.careInstructions}</div>
                    </div>
                  )}
                </div>
              )}

              {tab.key === "safety" && product.safetyInfo && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-terracotta">Safety / Important Information</h3>
                  <div className="mt-4 max-w-3xl whitespace-pre-line text-[15px] leading-7 text-text-primary/70">{product.safetyInfo}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
