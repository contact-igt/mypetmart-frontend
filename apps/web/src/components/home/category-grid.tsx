import Image from "next/image";
import Link from "next/link";
import { CATEGORIES, CATEGORY_PROMO_TEXT, type HomeCategory } from "./home-data";
import { ArrowRightIcon } from "@/components/icons";

const CATEGORY_IMAGES: Record<string, string> = {
  Grooming: "/assest/Grooming.png",
  "Walking Essentials": "/assest/Walking Essentials.png",
  "Cat Essentials": "/assest/Cat Essentials.png",
  "Paw Care": "/assest/Paw Care.png",
  "Dog Essentials": "/assest/Dog Essentials.png",
};

function CategoryTile({ category, className }: { category: HomeCategory; className?: string }) {
  return (
    <Link
      href={category.href}
      className={`group relative block min-h-[11.25rem] overflow-hidden rounded-[22px] ${className ?? ""}`}
    >
      <Image
        src={CATEGORY_IMAGES[category.label]}
        alt={category.imageLabel}
        fill
        sizes="(min-width: 640px) 33vw, 100vw"
        className="object-cover transition-transform duration-150 ease-out group-hover:scale-[1.02]"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent px-5 pb-4 pt-12">
        <p className="eyebrow text-[9px] tracking-[0.18em] text-white/85">{category.eyebrow}</p>
        <p className="display-heading mt-0.5 text-[1.45rem] leading-none text-white" style={{ fontFamily: "var(--font-bagel-fat-one)", fontWeight: 400 }}>
          {category.label}
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

export function CategoryGrid() {
  const [grooming, walking, cat, pawCare, dogEssentials] = CATEGORIES;

  return (
    <section className="relative isolate overflow-hidden bg-cream-bg py-16 sm:py-20 lg:py-24">
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
      <div className="relative z-10 mx-auto max-w-[1100px] px-6 sm:px-8">
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
          <CategoryTile category={grooming} className="md:col-start-1 md:row-span-2" />
          <PromoTile className="md:col-start-2 md:row-start-1" />
          <CategoryTile category={walking} className="md:col-start-2 md:row-start-2" />
          <CategoryTile category={cat} className="md:col-start-3 md:row-span-2" />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:max-w-[736px] md:grid-cols-3">
          <CategoryTile category={pawCare} className="md:h-[11.25rem]" />
          <CategoryTile category={dogEssentials} className="md:h-[11.25rem]" />
          <div className="hidden rounded-[22px] bg-deep-brown md:block md:h-[11.25rem]" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}