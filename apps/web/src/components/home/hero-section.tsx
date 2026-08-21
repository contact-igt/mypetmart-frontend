import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, ShieldCheckIcon, TruckIcon } from "@/components/icons";

export function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden bg-orange-hero">
      <Image
        src="/assest/Background1.png"
        alt=""
        width={800}
        height={1280}
        priority
        className="pointer-events-none absolute -right-16 -top-8 z-0 hidden h-auto w-[195px] lg:block"
      />

      <Image
        src="/assest/Vector1.png"
        alt=""
        width={194}
        height={131}
        className="pointer-events-none absolute left-[2rem] top-[9.5rem] z-0 hidden w-9 lg:block"
      />
      <Image
        src="/assest/SVG3.png"
        alt=""
        width={104}
        height={104}
        className="pointer-events-none absolute left-[46.2vw] top-[8.25rem] z-0 hidden w-6 lg:block"
      />

      <Image
        src="/assest/Vector2.png"
        alt=""
        width={104}
        height={104}
        className="pointer-events-none absolute left-[46.2vw] top-[13rem] z-0 hidden w-20 lg:block"
      />
      <Image
        src="/assest/SVG1.png"
        alt=""
        width={312}
        height={359}
        className="pointer-events-none absolute left-[56.25vw] top-[12.4rem] z-0 hidden w-16 lg:block"
      />
      <Image
        src="/assest/SVG2.png"
        alt=""
        width={538}
        height={538}
        className="pointer-events-none absolute left-[47vw] top-[17rem] z-0 hidden w-24 lg:block"
      />

      <Image
        src="/assest/Gradient2.png"
        alt=""
        width={1520}
        height={1520}
        className="pointer-events-none absolute -left-[0rem] -top[0rem] z-0 hidden w-[23rem] lg:block border-0"
      />
      {/* <Image
        src="/assest/Gradient2.png"
        alt=""
        width={1696}
        height={1696}
        className="pointer-events-none absolute -right-[30rem] bottom-[-32rem] z-0 hidden w-[54rem] lg:block"
      /> */}

      <div className="site-container relative z-10 pb-12 pt-5 lg:pb-20">
        <div className="grid items-center gap-8 pt-12 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:gap-5 lg:pt-16">
          <div className="motion-enter relative z-10 flex max-w-[38rem] flex-col items-start">
            <span className="inline-flex h-9 items-center gap-2 rounded-full bg-white px-4 text-[13px] font-medium uppercase tracking-[0.02em] text-text-primary">
              <Image
                src="/assest/SVG7.png"
                alt=""
                width={104}
                height={104}
                className="h-4 w-4 brightness-0"
              />
              Welcome to My Pet Mart
            </span>

            <h1 className="display-heading mt-5 text-[3.75rem] leading-[0.94] tracking-[-0.045em] text-text-primary sm:text-[4.5rem] lg:text-[4.85rem] xl:text-[100px] xl:leading-[100px] xl:tracking-[-2.56px]" style={{ fontFamily: "var(--font-bagel-fat-one)", fontWeight: 400 }}>
              <span className="block">Better</span>
              <span className="block text-white lg:whitespace-nowrap">
                <span className="block lg:inline">little</span>{" "}
                <span className="block lg:inline">things</span>
              </span>
              <span className="block lg:whitespace-nowrap">
                <span className="block lg:inline">for</span>{" "}
                <span className="block lg:inline">happier</span>
              </span>
              <span className="block">pets.</span>
            </h1>

            <p
              className="mt-10 max-w-[28rem] text-[18px] font-medium italic leading-[1.35] text-text-primary"
              style={{ fontFamily: "var(--font-display-italic)" }}
            >
              Discover practical grooming, walking and everyday pet-care essentials made to bring more
              comfort, confidence and joy to life with your pet.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/shop" className="button-primary motion-press h-12 min-w-[13.25rem] px-6 text-base inline-flex items-center justify-center gap-2 cursor-pointer">
                Shop Bestsellers <ArrowRightIcon width={16} height={16} />
              </Link>
              <Link href="/shop" className="button-secondary motion-press h-12 min-w-[13.25rem] border-deep-brown bg-deep-brown px-6 text-base text-white hover:border-terracotta hover:bg-terracotta focus-visible:border-terracotta focus-visible:bg-terracotta cursor-pointer inline-flex items-center justify-center">
                Explore All Products
              </Link>
            </div>

            <ul className="mt-8 flex flex-wrap gap-2" aria-label="My Pet Mart highlights">
              <li className="inline-flex h-[34px] items-center gap-2 rounded-full border border-text-primary/15 bg-[#ffe2bd] px-4 text-[10px] font-medium text-text-primary">
                <ShieldCheckIcon width={14} height={14} /> Verified pet-parent reviews
              </li>
              <li className="inline-flex h-[34px] items-center gap-2 rounded-full border border-text-primary/15 bg-[#ffe2bd] px-4 text-[10px] font-medium text-text-primary">
                <span aria-hidden="true" className="text-[15px] leading-none">₹</span> Cash on Delivery
              </li>
              <li className="inline-flex h-[34px] items-center gap-2 rounded-full border border-text-primary/15 bg-[#ffe2bd] px-4 text-[10px] font-medium text-text-primary">
                <TruckIcon width={15} height={15} /> Shipping across India
              </li>
            </ul>
          </div>

          <div className="relative isolate mx-auto w-full max-w-[42rem] lg:max-w-[50rem] lg:translate-x-[4%] xl:translate-y-5">
            <Image
              src="/assest/Gradient1.png"
              alt=""
              width={1520}
              height={1520}
              className="pointer-events-none absolute -bottom-[10rem] -left-[-10rem] z-0 hidden w-[23rem] lg:block"
            />
            <Image
              src="/assest/Group 5.png"
              alt="Golden retriever, cats, and puppy from My Pet Mart"
              width={3992}
              height={2834}
              priority
              className="motion-enter motion-enter-delay-1 relative z-10 h-auto w-full"
            />
          </div>
        </div>
      </div>

      <Image
        src="/assest/SVG6.png"
        alt=""
        width={112}
        height={112}
        className="pointer-events-none absolute bottom-70 left-9 z-0 hidden w-7 lg:block"
      />
    </section>
  );
}
