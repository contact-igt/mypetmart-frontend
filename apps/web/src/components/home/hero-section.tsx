import Image from "next/image";
import Link from "next/link";
import { Cat, Dog } from "lucide-react";
import {
  ArrowRightIcon,
  HeartIcon,
  ShieldCheckIcon,
  StarIcon,
  TruckIcon,
} from "@/components/icons";

export function HeroSection() {
  return (
    <section className="border-b border-deep-brown/10 bg-orange-hero">
      <div className="site-container grid gap-10 py-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)] lg:items-center lg:gap-14 lg:py-14 xl:gap-20 xl:py-16">
        <div className="motion-enter flex max-w-[38rem] flex-col items-start">
          <span className="inline-flex items-center rounded-full border border-deep-brown/15 bg-cream-bg px-4 py-2 text-sm font-semibold text-deep-brown">
            Grooming · Walking · Paw Care
          </span>

          <h1
            className="mt-6 text-[3.45rem] leading-[0.96] tracking-[-0.045em] text-text-primary sm:text-[4.5rem] lg:text-[4.35rem] xl:text-[5.25rem]"
            style={{ fontFamily: "var(--font-bagel-fat-one)", fontWeight: 400 }}
          >
            <span className="block">Better little</span>
            <span className="block">things</span>
            <span className="block">for happier pets.</span>
          </h1>

          <p className="mt-6 max-w-[34rem] text-base font-medium leading-[1.55] text-text-primary/75 sm:text-lg">
            Practical grooming, walking and everyday essentials — curated to make everyday pet care easier.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/shop" className="button-primary motion-press h-14 min-w-[13.5rem] px-6 text-base">
              Shop Best Sellers <ArrowRightIcon width={17} height={17} />
            </Link>
            <Link href="/shop" className="button-secondary motion-press h-14 min-w-[14rem] px-6 text-base">
              Explore All Products
            </Link>
          </div>

          <div className="mt-8 grid w-full max-w-[34rem] gap-3 sm:grid-cols-2">
            <Link
              href="/shop?petType=dog"
              className="group flex min-h-[84px] items-center gap-3 rounded-2xl border border-deep-brown/15 bg-white p-3 transition-colors duration-150 hover:border-primary-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-surface-secondary/50 text-terracotta" aria-hidden="true">
                <Dog size={29} strokeWidth={1.7} />
              </span>
              <span>
                <span className="block text-base font-bold text-text-primary">Dogs</span>
                <span className="block text-sm text-text-primary/65">Walk · groom · paws</span>
              </span>
            </Link>
            <Link
              href="/shop?petType=cat"
              className="group flex min-h-[84px] items-center gap-3 rounded-2xl border border-deep-brown/15 bg-white p-3 transition-colors duration-150 hover:border-primary-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-surface-secondary/50 text-terracotta" aria-hidden="true">
                <Cat size={29} strokeWidth={1.7} />
              </span>
              <span>
                <span className="block text-base font-bold text-text-primary">Cats</span>
                <span className="block text-sm text-text-primary/65">Grooming · essentials</span>
              </span>
            </Link>
          </div>
        </div>

        <div className="motion-enter motion-enter-delay-1 relative mx-auto w-full max-w-[38rem] pb-4">
          <div className="relative aspect-[1.14] overflow-hidden rounded-[28px] bg-surface-secondary/40 shadow-xl">
            <Image
              src="/assest/Group 5.png"
              alt="Golden retriever, cats, and puppy from My Pet Mart"
              fill
              priority
              sizes="(min-width: 1280px) 43vw, (min-width: 1024px) 46vw, 100vw"
              className="object-cover object-center"
            />
          </div>
          <div className="absolute -bottom-4 left-5 rounded-2xl border border-deep-brown/10 bg-white px-4 py-3 shadow-lg sm:left-7">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-terracotta">Pet care essentials</p>
            <p className="mt-0.5 text-sm font-bold text-text-primary">Made for everyday moments</p>
          </div>
        </div>
      </div>

      <div className="border-t border-deep-brown/10 bg-surface-secondary/20">
        <div className="site-container grid grid-cols-1 gap-4 py-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-7">
          <div className="flex items-center gap-3 text-sm font-semibold text-text-primary">
            <TruckIcon width={22} height={22} className="shrink-0 text-primary-orange" />
            <span>Thoughtfully selected essentials</span>
          </div>
          <div className="flex items-center gap-3 text-sm font-semibold text-text-primary">
            <HeartIcon width={22} height={22} className="shrink-0 text-primary-orange" />
            <span>Made for everyday pet care</span>
          </div>
          <div className="flex items-center gap-3 text-sm font-semibold text-text-primary">
            <ShieldCheckIcon width={22} height={22} className="shrink-0 text-primary-orange" />
            <span>Simple, secure shopping</span>
          </div>
          <div className="flex items-center gap-3 text-sm font-semibold text-text-primary">
            <StarIcon width={22} height={22} className="shrink-0 text-primary-orange" />
            <span>Explore by your pet&apos;s needs</span>
          </div>
        </div>
      </div>
    </section>
  );
}
