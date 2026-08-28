import { USP_CARDS } from "./home-data";

export function WhyMyPetMart() {
  return (
    <section className="section-block bg-cream-bg py-14 sm:py-16">
      <div className="site-container grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start lg:gap-16 xl:gap-24">
        <div className="max-w-[28rem]">
          <p className="text-sm font-bold uppercase tracking-[0.1em] text-terracotta">Why MyPetMart</p>
          <h2 className="mt-4 text-[2.6rem] leading-[0.96] tracking-[-0.04em] text-text-primary sm:text-[3.6rem]" style={{ fontFamily: "var(--font-bagel-fat-one)", fontWeight: 400 }}>
            <span className="block">Little things,</span>
            <span className="block">done well.</span>
          </h2>
          <p className="mt-6 text-lg leading-[1.55] text-text-primary/75">Thoughtfully selected essentials for everyday pet care.</p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {USP_CARDS.map((card, index) => (
            <div
              key={card.title}
              className="min-h-[11.25rem] rounded-[20px] border border-deep-brown/15 bg-white p-6 sm:p-7"
            >
              <span className="text-sm font-bold text-terracotta" aria-hidden="true">0{index + 1}</span>
              <h3 className="mt-4 text-xl font-bold leading-[1.15] text-text-primary">{card.title}</h3>
              <p className="mt-3 text-base leading-[1.5] text-text-primary/75">{card.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
