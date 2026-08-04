"use client";

import Image from "next/image";

/** Visual-only newsletter sign-up until the email service is connected. */
export function NewsletterCard() {
  return (
    <div className="relative z-10 mx-auto w-full max-w-[1100px] px-5 lg:-mb-[16.25rem] lg:px-0">
      <div className="relative min-h-[290px] overflow-hidden rounded-[30px] bg-orange-hero px-7 py-10 sm:px-12 lg:h-[313px] lg:px-[3.2rem] lg:py-12">
        <Image
          src="/assest/Vector6.png"
          alt=""
          aria-hidden="true"
          width={480}
          height={400}
          className="pointer-events-none absolute bottom-0 right-2 w-[7.6rem] opacity-40 sm:right-5 lg:right-4 lg:w-[7rem]"
        />
        <div className="relative grid h-full gap-8 lg:grid-cols-[350px_1fr] lg:items-center lg:gap-[4.6rem]">
          <div>
            <span className="pill-label bg-white text-text-primary">Newsletter</span>
            <h2
              className="mt-5 max-w-[280px] text-[2.75rem] leading-[0.98] tracking-[-0.04em] text-text-primary sm:text-[3.1rem] lg:text-[3.35rem]"
              style={{ fontFamily: "var(--font-bagel-fat-one)", fontWeight: 400 }}
            >
              Treats for your inbox.
            </h2>
            <p className="mt-3 max-w-[360px] text-[0.95rem] italic leading-[1.55] lg:text-[1rem] text-text-primary" style={{ fontFamily: "var(--font-display-italic)" }}>
              Product drops, gentle pet-care tips and a little extra cuteness — never spam.
            </p>
          </div>

          <form onSubmit={(event) => event.preventDefault()} className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
            <label htmlFor="newsletter-email" className="sr-only">Email address</label>
            <input
              id="newsletter-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@paws.com"
              className="h-[45px] min-w-0 flex-1 rounded-full border-0 bg-white px-5 text-[0.9rem] text-text-primary outline-none placeholder:text-[#9CA3AF] focus:ring-2 focus:ring-deep-brown/30"
            />
            <button type="submit" className="inline-flex h-[45px] shrink-0 items-center justify-center rounded-full bg-deep-brown px-6 text-[0.9rem] font-semibold text-white transition-opacity duration-150 hover:opacity-90">
              Subscribe
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}