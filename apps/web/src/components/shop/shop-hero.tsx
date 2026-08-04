import Image from "next/image";
import { PRODUCTS } from "@/data/products";

export function ShopHero() {
  return (
    <section className="overflow-hidden bg-cream-bg">
      <div className="grid xl:h-[402px] xl:grid-cols-[1.65fr_1fr]">
        <div className="flex bg-peach-hero px-6 py-16 sm:px-12 xl:items-start xl:pb-10 xl:pt-[6.45rem] xl:pl-[max(2rem,calc((103vw-1100px)/2))] xl:pr-12">
          <div>
            <span className="inline-flex h-[30px] items-center rounded-full bg-white px-4 text-[11px] font-medium uppercase tracking-[0.02em] text-text-primary">
              The shop
            </span>
            <h1 className="mt-6 text-text-primary">
              <span
                className="block text-[3.4rem] leading-[0.94] tracking-[-0.04em] sm:text-[4.3rem] xl:text-[4rem]"
                style={{ fontFamily: "var(--font-bagel-fat-one)", fontWeight: 400 }}
              >
                Everything they need to
              </span>
              <span
                className="mt-2 block text-[3.15rem] italic leading-[0.92] tracking-[-0.04em] sm:text-[4rem] xl:text-[3.70rem] xl:whitespace-nowrap"
                style={{ fontFamily: "var(--font-display-italic)" }}
              >
                wag, purr and play.
              </span>
            </h1>
          </div>
        </div>

        <div className="relative min-h-[19rem] xl:min-h-0">
          <Image
            src="/assest/shopbg.png"
            alt="Kittens and puppies peeking over a table"
            fill
            priority
            sizes="(min-width: 1280px) 38vw, 100vw"
            className="object-cover"
          />
          <div className="absolute bottom-6 left-6 rounded-[25px] bg-cream-bg px-6 py-5 shadow-[0_10px_22px_rgba(60,35,20,0.08)] xl:-left-[95px] xl:bottom-[30px] xl:w-[256px]">
            <span className="text-[12px] uppercase tracking-[0.18em] text-text-primary/80">Showing</span>
            <p className="mt-1 text-[2rem] leading-none tracking-[-0.03em] text-text-primary" style={{ fontFamily: "var(--font-bagel-fat-one)", fontWeight: 400 }}>
              {PRODUCTS.length} products
            </p>
            <p className="mt-1 text-sm text-text-primary/80">Handpicked, honestly reviewed.</p>
          </div>
        </div>
      </div>
    </section>
  );
}