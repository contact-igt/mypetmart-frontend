import Image from "next/image";
import Link from "next/link";
import { CATEGORY_PROMO_TEXT } from "./home-data";
import { ArrowRightIcon } from "@/components/icons";
import { ProductImagePlaceholder, type PlaceholderTone } from "@/components/image-placeholder";
import { getStorefrontCategories } from "@/lib/storefront-api";
import type { Category } from "@/types/storefront";

const HOME_CATEGORY_COUNT = 5;
const TILE_TONES: readonly PlaceholderTone[] = ["terracotta", "orange", "mint", "peach", "brown"];

async function getHomeCategories(): Promise<Category[]> {
  const categories = await getStorefrontCategories(undefined, { showOnHomepage: true });
  return categories.slice(0, HOME_CATEGORY_COUNT);
}

function CategoryTile({ category, tone, className }: { category: Category; tone: PlaceholderTone; className?: string }) {
  return (
    <Link
      href={`/shop?category=${category.slug}`}
      className={`group relative block min-h-[11.25rem] overflow-hidden rounded-[22px] ${className ?? ""}`}
    >
      {category.imageUrl ? (
        <Image
          src={category.imageUrl}
          alt={category.imageAlt || category.name}
          fill
          sizes="(min-width: 640px) 33vw, 100vw"
          className="object-cover transition-transform duration-150 ease-out group-hover:scale-[1.02]"
        />
      ) : (
        <ProductImagePlaceholder label={category.name} tone={tone} className="absolute inset-0 h-full w-full" />
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent px-5 pb-4 pt-12">
        <p className="eyebrow text-[9px] tracking-[0.18em] text-white/85">
          {category.petType === "all" ? "For Dogs & Cats" : `For ${category.petType}s`}
        </p>
        <p className="display-heading mt-0.5 text-[1.45rem] leading-none text-white" style={{ fontFamily: "var(--font-bagel-fat-one)", fontWeight: 400 }}>
          {category.name}
        </p>
      </div>
    </Link>
  );
}

function PromoTile({ className }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center rounded-[22px] bg-yellow-card px-6 text-center ${className ?? ""}`}>
      <p
        className="max-w-[14rem] text-[2.2rem] italic leading-[0.95] text-text-primary"
        style={{ fontFamily: "var(--font-display-italic)" }}
      >
        {CATEGORY_PROMO_TEXT}
      </p>
    </div>
  );
}

export function CategoryGridSkeleton() {
  return (
    <section className="section-block relative isolate overflow-hidden bg-cream-bg pb-12 md:pb-20">
      <div className="site-container relative z-10">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="inline-flex h-6 items-center rounded-full bg-peach-hero px-3 text-[10px] font-semibold uppercase tracking-[0.02em] text-text-primary">
              Categories
            </span>
            <h2 className="mt-5 text-text-primary">
              <span className="display-heading block text-[2.8rem] leading-[0.9] tracking-[-0.04em] sm:text-[3.6rem]" style={{ fontFamily: "var(--font-bagel-fat-one)", fontWeight: 400 }}>
                Tail - Wagging
              </span>
              <span
                className="block text-[3.05rem] italic leading-[0.9] tracking-[-0.04em] sm:text-[3.9rem] mt-[1rem]"
                style={{ fontFamily: "var(--font-display-italic)" }}
              >
                favourites.
              </span>
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.25fr_1fr_.78fr] md:grid-rows-[11.25rem_11.25rem]">
          <div className="animate-pulse rounded-[22px] bg-[#FFF8EF] md:col-start-1 md:row-span-2 min-h-[11.25rem]" />
          <div className="animate-pulse rounded-[22px] bg-[#FFF8EF] md:col-start-2 md:row-start-1 min-h-[11.25rem]" />
          <div className="animate-pulse rounded-[22px] bg-[#FFF8EF] md:col-start-2 md:row-start-2 min-h-[11.25rem]" />
          <div className="animate-pulse rounded-[22px] bg-[#FFF8EF] md:col-start-3 md:row-span-2 min-h-[11.25rem]" />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:max-w-[736px] md:grid-cols-3">
          <div className="animate-pulse rounded-[22px] bg-[#FFF8EF] md:h-[11.25rem]" />
          <div className="animate-pulse rounded-[22px] bg-[#FFF8EF] md:h-[11.25rem]" />
        </div>
      </div>
    </section>
  );
}

export async function CategoryGrid() {
  let categories: Category[] = [];

  try {
    categories = await getHomeCategories();
  } catch {
    // A failed fetch here must never take down the rest of the Home page —
    // the section still renders with its static promo/CTA tiles.
    categories = [];
  }

  const [grooming, walking, cat, pawCare, dogEssentials] = categories;

  return (
    <section className="section-block relative isolate overflow-hidden bg-cream-bg pb-12 md:pb-20">
      <Image
        src="/assest/Vector5.png"
        alt=""
        width={194}
        height={131}
        className="pointer-events-none absolute left-[3vw] top-24 z-0 hidden w-12 lg:block"
      />
      <Image
        src="/assest/Vector3.png"
        alt=""
        width={160}
        height={160}
        className="pointer-events-none absolute left-[46%] top-14 z-0 hidden w-20 lg:block"
      />
      <Image
        src="/assest/SVG8.png"
        alt=""
        width={104}
        height={104}
        className="pointer-events-none absolute right-[5vw] top-[5.5rem] z-0 hidden w-12 lg:block"
      />
      <svg
        aria-hidden="true"
        viewBox="0 0 1360 900"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 z-0 hidden h-full w-full lg:block"
      >
        <path
          d="M 1160 -8 C 980 125, 510 180, 252 360"
          fill="none"
          stroke="#E8A27A"
          strokeDasharray="4 6"
          strokeWidth="1.5"
        />
        <path
          d="M 588 730 C 705 760, 842 800, 900 900"
          fill="none"
          stroke="#E8A27A"
          strokeDasharray="4 6"
          strokeWidth="1.5"
        />
      </svg>
      <div className="site-container relative z-10">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="inline-flex h-6 items-center rounded-full bg-peach-hero px-3 text-[10px] font-semibold uppercase tracking-[0.02em] text-text-primary">
              Categories
            </span>
            <h2 className="mt-5 text-text-primary">
              <span className="display-heading block text-[2.8rem] leading-[0.9] tracking-[-0.04em] sm:text-[3.6rem]" style={{ fontFamily: "var(--font-bagel-fat-one)", fontWeight: 400 }}>
                Tail - Wagging
              </span>
              <span
                className="block text-[3.05rem] italic leading-[0.9] tracking-[-0.04em] sm:text-[3.9rem] mt-[1rem]"
                style={{ fontFamily: "var(--font-display-italic)" }}
              >
                favourites.
              </span>
            </h2>
          </div>

          <Link
            href="/shop"
            className="body-copy mb-1 inline-flex items-center gap-2 border-b border-text-primary pb-1 text-sm font-semibold text-text-primary"
          >
            See everything <ArrowRightIcon width={15} height={15} />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.25fr_1fr_.78fr] md:grid-rows-[11.25rem_11.25rem]">
          {grooming && <CategoryTile category={grooming} tone={TILE_TONES[0]!} className="md:col-start-1 md:row-span-2" />}
          <PromoTile className="md:col-start-2 md:row-start-1" />
          {walking && <CategoryTile category={walking} tone={TILE_TONES[1]!} className="md:col-start-2 md:row-start-2" />}
          {cat && <CategoryTile category={cat} tone={TILE_TONES[2]!} className="md:col-start-3 md:row-span-2" />}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:max-w-[736px] md:grid-cols-3">
          {pawCare && <CategoryTile category={pawCare} tone={TILE_TONES[3]!} className="md:h-[11.25rem]" />}
          {dogEssentials && <CategoryTile category={dogEssentials} tone={TILE_TONES[4]!} className="md:h-[11.25rem]" />}
          <Link
            href="/shop"
            className="group hidden flex-col justify-between rounded-[22px] bg-deep-brown p-5 text-white transition-all duration-150 ease-out hover:bg-deep-brown/95 md:flex md:h-[11.25rem]"
          >
            <span className="eyebrow text-[9px] tracking-[0.18em] text-white/80">Full Catalog</span>
            <div className="flex items-end justify-between">
              <p
                className="display-heading text-[1.35rem] leading-tight text-white"
                style={{ fontFamily: "var(--font-bagel-fat-one)", fontWeight: 400 }}
              >
                Shop All Products
              </p>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-transform duration-150 group-hover:translate-x-1">
                <ArrowRightIcon width={16} height={16} />
              </div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
