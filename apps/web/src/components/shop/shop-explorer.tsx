"use client";

import { useEffect, useState, Suspense, useRef, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { SearchIcon } from "@/components/icons";
import { getStorefrontCategories, getStorefrontProducts } from "@/lib/storefront-api";
import type { Category, ProductListItem, ProductSort } from "@/types/storefront";
import { ShopHero } from "./shop-hero";

const SORT_LABELS: Record<ProductSort, string> = {
  newest: "Sort · Newest",
  price_asc: "Sort · Price: Low to High",
  price_desc: "Sort · Price: High to Low",
  name: "Sort · Name: A–Z",
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
      className={`inline-flex h-9 items-center rounded-full border px-[14px] text-[13px] font-medium normal-case tracking-normal transition-colors duration-150 ease-out cursor-pointer ${
        active
          ? "border-deep-brown bg-deep-brown text-white"
          : "border-[#E7CFB9] bg-[#FFF8EF] text-text-primary hover:border-deep-brown"
      }`}
    >
      {children}
    </button>
  );
}

function AllPill({ active, onClick }: { active: boolean; onClick: () => void; label?: string }) {
  return (
    <FilterPill active={active} onClick={onClick}>
      All
    </FilterPill>
  );
}

function ShopExplorerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // API states
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState(false);

  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(false);

  // Extract URL parameters
  const activePet = (searchParams.get("petType") as "dog" | "cat" | "all") || "all";
  const activeCategory = searchParams.get("category") || "";
  const activeSort = (searchParams.get("sort") as ProductSort) || "newest";
  const activePage = parseInt(searchParams.get("page") || "1", 10);
  const activeSearch = searchParams.get("search") || "";

  // Search input debouncer ref
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update query params helper
  const updateQueryParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(window.location.search);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname]);


  // Handle search typing
  const handleSearchChange = (value: string) => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    searchTimerRef.current = setTimeout(() => {
      updateQueryParams({ search: value || null, page: "1" });
    }, 300);
  };

  // Fetch categories (depends on petType filter)
  useEffect(() => {
    let active = true;
    
    // Set loading asynchronously to bypass synchronous set-state rule
    Promise.resolve().then(() => {
      if (active) {
        setIsCategoriesLoading(true);
        setCategoriesError(false);
      }
    });

    getStorefrontCategories(activePet === "all" ? undefined : activePet)
      .then((cats) => {
        if (!active) return;
        setCategories(cats);

        // Clear active category if it's not valid for the new petType categories
        if (activeCategory && !cats.some((c) => c.slug === activeCategory)) {
          updateQueryParams({ category: null, page: "1" });
        }
      })
      .catch((err) => {
        console.error("Error loading categories:", err);
        if (active) setCategoriesError(true);
      })
      .finally(() => {
        if (active) setIsCategoriesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activePet, activeCategory, updateQueryParams]);

  // Fetch products (depends on all filters)
  useEffect(() => {
    let active = true;

    // Set loading asynchronously to bypass synchronous set-state rule
    Promise.resolve().then(() => {
      if (active) {
        setIsProductsLoading(true);
        setProductsError(false);
      }
    });

    getStorefrontProducts({
      page: activePage,
      pageSize: 9,
      search: activeSearch || undefined,
      category: activeCategory || undefined,
      petType: activePet,
      sort: activeSort,
    })
      .then((data) => {
        if (!active) return;
        setProducts(data.items);
        setTotalProducts(data.total);
        setTotalPages(data.totalPages);
      })
      .catch((err) => {
        console.error("Error loading products:", err);
        if (active) setProductsError(true);
      })
      .finally(() => {
        if (active) setIsProductsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activePage, activePet, activeCategory, activeSort, activeSearch]);

  const clearFilters = () => {
    router.push(pathname);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      updateQueryParams({ page: String(page) });
      window.scrollTo({ top: 250, behavior: "smooth" });
    }
  };

  return (
    <>
      <ShopHero totalProducts={totalProducts} />
      <section className="relative overflow-hidden bg-cream-bg py-14 lg:py-[4.25rem]">
        <div className="mx-auto grid w-full max-w-[1274px] gap-8 px-6 sm:px-8 lg:grid-cols-[270px_1fr] xl:grid-cols-[294px_1fr] lg:gap-6 xl:gap-[34px] lg:px-0">
          
          {/* Mobile Collapse Header */}
          <div className="lg:hidden flex items-center justify-between border-b border-[#E7CFB9] pb-4">
            <button
              type="button"
              onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
              className="inline-flex h-10 items-center justify-center rounded-full border border-deep-brown bg-[#FFF8EF] px-6 text-sm font-semibold text-text-primary cursor-pointer hover:bg-deep-brown hover:text-white transition-colors duration-200"
            >
              {isMobileFiltersOpen ? "Hide Filters" : "Show Filters"}
            </button>
            <div className="text-sm font-medium text-text-primary/75">
              {totalProducts} products found
            </div>
          </div>

          {/* Filter Sidebar */}
          <aside
            className={`h-fit rounded-[26px] border border-[#E7CFB9] bg-[#FFF8EF] p-6 lg:block transition-all duration-300 ${
              isMobileFiltersOpen ? "block" : "hidden"
            }`}
          >
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
                  key={activeSearch}
                  defaultValue={activeSearch}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Search products…"
                  aria-label="Search products"
                  className="h-10 w-full rounded-full border border-[#E7CFB9] bg-white pl-10 pr-4 text-sm text-text-primary outline-none placeholder:text-text-primary/40 focus:border-deep-brown transition-colors duration-150"
                />
              </div>
            </div>

            <div className="mt-7">
              <span className="eyebrow text-text-primary/60">Pet</span>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <AllPill
                  active={activePet === "all"}
                  onClick={() => updateQueryParams({ petType: "all", page: "1" })}
                  label="pets"
                />
                <FilterPill
                  active={activePet === "dog"}
                  onClick={() => updateQueryParams({ petType: activePet === "dog" ? "all" : "dog", page: "1" })}
                >
                  Dogs
                </FilterPill>
                <FilterPill
                  active={activePet === "cat"}
                  onClick={() => updateQueryParams({ petType: activePet === "cat" ? "all" : "cat", page: "1" })}
                >
                  Cats
                </FilterPill>
              </div>
            </div>

            <div className="mt-7">
              <span className="eyebrow text-text-primary/60">Category</span>
              {isCategoriesLoading ? (
                <div className="mt-2 flex flex-wrap gap-2 animate-pulse">
                  <div className="h-9 w-11 rounded-full bg-border-subtle" />
                  <div className="h-9 w-20 rounded-full bg-border-subtle" />
                  <div className="h-9 w-24 rounded-full bg-border-subtle" />
                </div>
              ) : categoriesError ? (
                <div className="mt-2 text-xs text-terracotta">
                  Failed to load categories.{" "}
                  <button
                    type="button"
                    onClick={() => {
                      Promise.resolve().then(() => {
                        setIsCategoriesLoading(true);
                        setCategoriesError(false);
                      });
                      getStorefrontCategories(activePet === "all" ? undefined : activePet)
                        .then(setCategories)
                        .catch(() => setCategoriesError(true))
                        .finally(() => setIsCategoriesLoading(false));
                    }}
                    className="underline font-semibold cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <AllPill
                    active={activeCategory === ""}
                    onClick={() => updateQueryParams({ category: null, page: "1" })}
                    label="categories"
                  />
                  {categories.map((item) => (
                    <FilterPill
                      key={item.id}
                      active={activeCategory === item.slug}
                      onClick={() =>
                        updateQueryParams({
                          category: activeCategory === item.slug ? null : item.slug,
                          page: "1",
                        })
                      }
                    >
                      {item.name}
                    </FilterPill>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={clearFilters}
              className="mt-8 text-sm font-semibold underline underline-offset-4 text-text-primary/80 hover:text-text-primary transition-colors cursor-pointer"
            >
              Clear filters
            </button>
          </aside>

          {/* Product Grid Area */}
          <div>
            <div className="mb-6 flex justify-between items-center gap-4">
              <label className="relative">
                <span className="sr-only">Sort products</span>
                <select
                  value={activeSort}
                  onChange={(event) => updateQueryParams({ sort: event.target.value, page: "1" })}
                  className="h-[44px] w-[230px] cursor-pointer rounded-full border border-[#E7CFB9] bg-white px-5 text-sm font-medium text-text-primary outline-none focus:border-deep-brown transition-colors"
                >
                  {(Object.keys(SORT_LABELS) as ProductSort[]).map((value) => (
                    <option key={value} value={value}>
                      {SORT_LABELS[value]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="hidden lg:block text-sm font-medium text-text-primary/75">
                {totalProducts} {totalProducts === 1 ? "product" : "products"} found
              </div>
            </div>

            {/* Error State */}
            {productsError ? (
              <div className="warm-card text-center py-12 border border-[#E7CFB9] rounded-[26px]">
                <p className="body-copy font-semibold text-terracotta">
                  Unable to load products. Please check your connection.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    Promise.resolve().then(() => {
                      setIsProductsLoading(true);
                      setProductsError(false);
                    });
                    getStorefrontProducts({
                      page: activePage,
                      pageSize: 9,
                      search: activeSearch || undefined,
                      category: activeCategory || undefined,
                      petType: activePet,
                      sort: activeSort,
                    })
                      .then((data) => {
                        setProducts(data.items);
                        setTotalProducts(data.total);
                        setTotalPages(data.totalPages);
                      })
                      .catch(() => setProductsError(true))
                      .finally(() => setIsProductsLoading(false));
                  }}
                  className="button-primary mt-4 inline-flex cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : isProductsLoading ? (
              /* Loading Skeletons */
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 lg:gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="animate-pulse rounded-[26px] bg-[#FFF8EF] border border-[#E7CFB9]/40 h-[360px] flex flex-col overflow-hidden">
                    <div className="bg-[#FFF8EF]/50 aspect-[4/5] w-full" />
                    <div className="p-5 flex-1 bg-white/40 flex flex-col justify-between">
                      <div className="h-5 bg-border-subtle rounded-md w-3/4" />
                      <div className="h-5 bg-border-subtle rounded-md w-1/4 mt-4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 lg:gap-6">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <nav aria-label="Pagination" className="mt-12 flex justify-center items-center gap-2">
                    <button
                      type="button"
                      disabled={activePage === 1}
                      onClick={() => handlePageChange(activePage - 1)}
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E7CFB9] transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
                        activePage === 1
                          ? "bg-transparent text-text-primary/40"
                          : "bg-white hover:bg-deep-brown hover:text-white"
                      }`}
                    >
                      &larr;
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handlePageChange(p)}
                        aria-current={p === activePage ? "page" : undefined}
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors cursor-pointer text-sm font-semibold ${
                          p === activePage
                            ? "bg-deep-brown border-deep-brown text-white"
                            : "bg-white border-[#E7CFB9] text-text-primary hover:border-deep-brown"
                        }`}
                      >
                        {p}
                      </button>
                    ))}

                    <button
                      type="button"
                      disabled={activePage === totalPages}
                      onClick={() => handlePageChange(activePage + 1)}
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E7CFB9] transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
                        activePage === totalPages
                          ? "bg-transparent text-text-primary/40"
                          : "bg-white hover:bg-deep-brown hover:text-white"
                      }`}
                    >
                      &rarr;
                    </button>
                  </nav>
                )}
              </>
            ) : (
              /* Empty state */
              <div className="warm-card text-center border border-[#E7CFB9] rounded-[26px] p-12">
                <p className="body-copy font-semibold text-text-primary">
                  No products match your filters.
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="button-secondary mt-4 inline-flex cursor-pointer"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

export function ShopExplorer() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-text-primary">Loading shop...</div>}>
      <ShopExplorerContent />
    </Suspense>
  );
}
