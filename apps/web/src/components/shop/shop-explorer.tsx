"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { SearchIcon } from "@/components/icons";
import { CATEGORIES } from "@/data/categories";
import { PRODUCTS, type ProductCategory } from "@/data/products";

type CategoryFilter = "all" | ProductCategory | "new-arrivals";
type PetFilter = "all" | "dog" | "cat";
type SortOrder = "featured" | "price-asc" | "price-desc";

const SORT_LABELS: Record<SortOrder, string> = {
  featured: "Sort · Featured",
  "price-asc": "Sort · Price: Low to High",
  "price-desc": "Sort · Price: High to Low",
};

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-9 items-center rounded-full border px-[14px] text-[13px] font-medium normal-case tracking-normal transition-colors duration-150 ease-out ${
        active
          ? "border-deep-brown bg-deep-brown text-white"
          : "border-[#E7CFB9] bg-[#FFF8EF] text-text-primary hover:border-deep-brown"
      }`}
    >
      {children}
    </button>
  );
}

function AllPill({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`All ${label}`}
      title={`All ${label}`}
      className={`h-9 w-11 shrink-0 rounded-full border transition-colors duration-150 ease-out ${
        active ? "border-deep-brown bg-deep-brown" : "border-[#E7CFB9] bg-[#FFF8EF]"
      }`}
    />
  );
}

/**
 * "Basic" filters (search, pet, category) are functional per
 * docs/DESIGN_SYSTEM.md §18 — advanced facets (rating, price range, on-sale/
 * in-stock toggles) render for visual composition only and stay inert,
 * since "Advanced filters" is a CLAUDE.md scope exclusion and star ratings
 * are an unconfirmed public claim.
 */
export function ShopExplorer() {
  const [search, setSearch] = useState("");
  const [pet, setPet] = useState<PetFilter>("all");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [sort, setSort] = useState<SortOrder>("featured");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    let results = PRODUCTS.filter((product) => {
      if (query && !product.name.toLowerCase().includes(query)) return false;
      if (pet !== "all" && product.pet !== pet) return false;
      if (category === "new-arrivals" && !product.isNew) return false;
      if (category !== "all" && category !== "new-arrivals" && product.category !== category)
        return false;
      return true;
    });
    if (sort === "price-asc") results = [...results].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") results = [...results].sort((a, b) => b.price - a.price);
    return results;
  }, [search, pet, category, sort]);

  const clearFilters = () => {
    setSearch("");
    setPet("all");
    setCategory("all");
    setSort("featured");
  };

  return (
    <section className="relative overflow-hidden bg-cream-bg py-14 lg:py-[4.25rem]">
      <div className="mx-auto grid w-full max-w-[1274px] gap-8 px-6 sm:px-8 lg:grid-cols-[270px_1fr] xl:grid-cols-[294px_1fr] lg:gap-6 xl:gap-[34px] lg:px-0">
        <aside className="h-fit min-h-[768px] rounded-[26px] border border-[#E7CFB9] bg-[#FFF8EF] p-6">
          <div>
            <span className="eyebrow text-text-primary/60">Search</span>
            <div className="relative mt-2">
              <SearchIcon
                width={16}
                height={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-primary/50"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products…"
                aria-label="Search products"
                className="h-10 w-full rounded-full border border-[#E7CFB9] bg-white pl-10 pr-4 text-sm text-text-primary outline-none placeholder:text-text-primary/40"
              />
            </div>
          </div>

          <div className="mt-7">
            <span className="eyebrow text-text-primary/60">Pet</span>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <AllPill active={pet === "all"} onClick={() => setPet("all")} label="pets" />
              <FilterPill active={pet === "dog"} onClick={() => setPet(pet === "dog" ? "all" : "dog")}>
                Dogs
              </FilterPill>
              <FilterPill active={pet === "cat"} onClick={() => setPet(pet === "cat" ? "all" : "cat")}>
                Cats
              </FilterPill>
            </div>
          </div>

          <div className="mt-7">
            <span className="eyebrow text-text-primary/60">Category</span>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <AllPill
                active={category === "all"}
                onClick={() => setCategory("all")}
                label="categories"
              />
              {CATEGORIES.map((item) => (
                <FilterPill
                  key={item.label}
                  active={category === item.label}
                  onClick={() =>
                    setCategory(category === item.label ? "all" : (item.label as ProductCategory))
                  }
                >
                  {item.label}
                </FilterPill>
              ))}
              <FilterPill
                active={category === "new-arrivals"}
                onClick={() => setCategory(category === "new-arrivals" ? "all" : "new-arrivals")}
              >
                New Arrivals
              </FilterPill>
            </div>
          </div>

          <div className="mt-7">
            <span className="eyebrow text-text-primary/60">Max price: ₹2,500</span>
            <input
              type="range"
              min={0}
              max={2500}
              defaultValue={2500}
              disabled
              aria-label="Maximum price (coming soon)"
              className="mt-3 h-[17px] w-full appearance-none bg-white accent-white"
            />
          </div>

          <div className="mt-7">
            <span className="eyebrow text-text-primary/60">Minimum rating</span>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                aria-hidden="true"
                className="h-9 w-[52px] shrink-0 rounded-full border border-deep-brown bg-deep-brown"
              />
              {["3+★", "4+★", "4.5+★"].map((label) => (
                <span key={label} className="inline-flex h-9 items-center rounded-full border border-[#E7CFB9] bg-[#FFF8EF] px-[14px] text-[13px] font-medium text-text-primary">
                  {label}
                </span>
              ))}
            </div>
            <p className="body-copy mt-1.5 text-xs text-text-primary/50">
              Coming soon — no rating data yet.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            {["New arrivals only", "On sale", "In stock"].map((label) => (
              <label key={label} className="body-copy flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-deep-brown" />
                {label}
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className="mt-7 text-sm font-medium underline underline-offset-4"
          >
            Clear filters
          </button>
        </aside>

        <div>
          <div className="mb-6 flex items-center gap-4">
            <label className="relative">
              <span className="sr-only">Sort products</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortOrder)}
                className="h-[44px] w-[230px] cursor-pointer rounded-full border border-[#E7CFB9] bg-white px-5 text-sm font-medium text-text-primary outline-none"
              >
                {(Object.keys(SORT_LABELS) as SortOrder[]).map((value) => (
                  <option key={value} value={value}>
                    {SORT_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 lg:gap-6">
              {filtered.map((product) => (
                <ProductCard key={product.slug} product={product} />
              ))}
            </div>
          ) : (
            <div className="warm-card text-center">
              <p className="body-copy font-semibold text-text-primary">
                No products match your filters.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="button-secondary mt-4 inline-flex"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
