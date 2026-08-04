import Image from "next/image";

export function ContactHero() {
  return (
    <section className="overflow-hidden bg-cream-bg">
      <div className="relative overflow-hidden bg-cream-bg xl:h-[28px]">
        <svg
          aria-hidden="true"
          viewBox="0 0 1910 46"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 hidden h-full w-full xl:block"
        >
          <path
            d="M 1140 46 C 1290 26, 1515 0, 1640 33 C 1655 39, 1640 43, 1628 46"
            fill="none"
            stroke="#E8A27A"
            strokeDasharray="4 6"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      <div className="grid xl:h-[365px] xl:grid-cols-[1.1fr_.9fr]">
        <div className="flex bg-peach-hero px-6 py-16 sm:px-12 xl:items-start xl:pb-10 xl:pt-[4.9rem] xl:pl-[max(2rem,calc((105vw-1100px)/2))] xl:pr-12">
          <div className="max-w-[38rem]">
            <span className="inline-flex h-[30px] items-center rounded-full bg-white px-4 text-[11px] font-medium uppercase tracking-[0.02em] text-text-primary">
              Contact
            </span>

            <h1 className="mt-5 text-text-primary">
              <span
                className="block text-[3.8rem] leading-[0.9] tracking-[-0.04em] sm:text-[4.5rem] xl:text-[3.75rem]"
                style={{ fontFamily: "var(--font-bagel-fat-one)", fontWeight: 400 }}
              >
                We&apos;re all ears.
              </span>
              <span
                className="mt-3 block text-[3.4rem] italic leading-[0.9] tracking-[-0.04em] sm:text-[4.1rem] xl:text-[3.75rem] xl:whitespace-nowrap"
                style={{ fontFamily: "var(--font-display-italic)" }}
              >
                Even the floppy ones.
              </span>
            </h1>

            <p
              className="mt-5 max-w-[34rem] text-[15px] font-medium italic leading-[1.45] text-text-primary"
              style={{ fontFamily: "var(--font-display-italic)" }}
            >
              Questions about a product, delivery or your order? Our team is ready to help.
            </p>
          </div>
        </div>

        <div className="relative min-h-[19rem] xl:min-h-0">
          <Image
            src="/assest/ctbg.png"
            alt="Cats and dogs peeking over a table"
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      </div>

      <div className="relative h-14 overflow-hidden bg-cream-bg xl:h-[52px]">
        <svg
          aria-hidden="true"
          viewBox="0 0 1910 96"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 hidden h-full w-full xl:block"
        >
          <path
            d="M 430 0 C 410 20, 520 50, 690 78 C 790 95, 885 96, 960 96"
            fill="none"
            stroke="#E8A27A"
            strokeDasharray="4 6"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    </section>
  );
}