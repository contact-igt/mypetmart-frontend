import type { ReactNode } from "react";

/** Shared shell + typography for the static legal/policy pages (privacy, refund, …). */
export function PolicyPage({ title, lastUpdated, children }: { title: string; lastUpdated?: string; children: ReactNode }) {
  return (
    <main className="flex-1 bg-cream-bg">
      <section className="bg-peach-hero">
        <div className="site-container py-14 sm:py-16">
          <span className="pill-label bg-white text-text-primary">Legal</span>
          <h1
            className="mt-5 text-[3.2rem] leading-[0.95] tracking-[-0.04em] text-text-primary sm:text-[4.2rem]"
            style={{ fontFamily: "var(--font-bagel-fat-one)", fontWeight: 400 }}
          >
            {title}
          </h1>
          {lastUpdated && <p className="body-copy mt-5 text-base text-text-primary/75 sm:text-lg">Last updated: {lastUpdated}</p>}
        </div>
      </section>

      <section className="section-block">
        <div className="site-container">
          <article className="rounded-[26px] border border-deep-brown/15 bg-white p-6 text-[15px] leading-[1.75] text-text-primary/80 sm:p-10 sm:text-base lg:px-14 lg:py-12">
            {children}
          </article>
        </div>
      </section>
    </main>
  );
}

export function PolicyH2({ children }: { children: ReactNode }) {
  return <h2 className="display-heading mt-12 text-[1.6rem] text-text-primary first:mt-0 sm:text-[1.9rem]">{children}</h2>;
}

export function PolicyH3({ children }: { children: ReactNode }) {
  return <h3 className="mt-8 text-lg font-bold text-text-primary">{children}</h3>;
}

export function PolicyP({ children }: { children: ReactNode }) {
  return <p className="mt-4">{children}</p>;
}

export function PolicyUL({ children }: { children: ReactNode }) {
  return <ul className="mt-4 list-disc space-y-3 pl-6 marker:text-primary-orange">{children}</ul>;
}
