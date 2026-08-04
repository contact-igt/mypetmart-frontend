import Image from "next/image";
import type { Product } from "@/data/products";
import { HeartIcon, StarIcon } from "@/components/icons";

const PRODUCT_IMAGES: Record<Product["category"], string> = {
  Grooming: "/assest/Grooming.png",
  "Walking Essentials": "/assest/Walking Essentials.png",
  "Paw Care": "/assest/Paw Care.png",
  "Dog Essentials": "/assest/Dog Essentials.png",
  "Cat Essentials": "/assest/Cat Essentials.png",
};

const CARD_SURFACES: Record<Product["category"], string> = {
  Grooming: "bg-[#F7D09D]",
  "Walking Essentials": "bg-[#FFF8EF]",
  "Paw Care": "bg-[#F4BD84]",
  "Dog Essentials": "bg-[#F3C496]",
  "Cat Essentials": "bg-[#FFF8ED]",
};

const RATING_COPY: Record<string, { score: string; count: string }> = {
  "mist-powered-pet-grooming-brush": { score: "4.8", count: "214" },
  "dog-anti-slip-paw-pads": { score: "4.7", count: "168" },
  "ultimate-dual-dog-leash": { score: "4.9", count: "96" },
  "warm-clay-slow-feed-bowl": { score: "4.8", count: "81" },
  "arch-cave-cat-bed": { score: "4.8", count: "102" },
  "everyday-walking-harness": { score: "4.7", count: "128" },
  "hydrating-paw-balm": { score: "4.9", count: "74" },
  "rubber-bone-chew-toy": { score: "4.8", count: "118" },
};

export function ProductCard({ product }: { product: Product }) {
  const rating = RATING_COPY[product.slug];
  const isLowStock = product.slug === "arch-cave-cat-bed";

  return (
    <article className="overflow-hidden rounded-[26px] bg-[#FFF8EF] shadow-[0_10px_22px_rgba(88,51,29,0.04)]">
      <div className="relative aspect-[4/5] overflow-hidden">
        <Image src={PRODUCT_IMAGES[product.category]} alt={product.imageLabel} fill sizes="(min-width: 1024px) 20vw, (min-width: 640px) 45vw, 100vw" className="object-cover" />
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {product.isNew && <span className="rounded-full bg-teal-mint-accent px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-text-primary">New</span>}
          <span className="rounded-full bg-terracotta px-3 py-1.5 text-[11px] font-semibold text-white">-{product.discountPercent}%</span>
          {isLowStock && <span className="rounded-full bg-yellow-card px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-text-primary">Low stock</span>}
        </div>
        <button type="button" aria-label="Add to wishlist" title="Add to wishlist" className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center text-text-primary transition-opacity duration-150 hover:opacity-60">
          <HeartIcon width={19} height={19} />
        </button>
      </div>
      <div className={`${CARD_SURFACES[product.category]} min-h-[143px] p-5`}>
        <div className="mb-2 flex items-center gap-1.5 text-[13px] leading-none text-text-primary"><StarIcon width={14} height={14} /><span>{rating.score}</span><span>({rating.count})</span></div>
        <p className="min-h-[3rem] text-[1.2rem] leading-[1.15] text-text-primary" style={{ fontFamily: "var(--font-display-italic)" }}>{product.name}</p>
        <p className="mt-3 flex items-baseline gap-2"><span className="text-[1.2rem] leading-none text-text-primary" style={{ fontFamily: "var(--font-bagel-fat-one)", fontWeight: 400 }}>₹{product.price.toLocaleString("en-IN")}</span><span className="text-sm text-text-primary/55 line-through">₹{product.originalPrice.toLocaleString("en-IN")}</span></p>
      </div>
    </article>
  );
}