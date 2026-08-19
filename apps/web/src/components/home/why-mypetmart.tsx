import { USP_CARDS } from "./home-data";

export function WhyMyPetMart() {
  return (
    <section className="section-block bg-cream-bg">
      <div className="site-container">
        <span className="pill-label bg-yellow-card text-text-primary">Why My Pet Mart</span>
        <h2 className="display-heading mt-4 text-3xl text-text-primary sm:text-4xl">
          Little things,
          <span className="accent">done well.</span>
        </h2>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {USP_CARDS.map((card, index) => (
            <div
              key={card.title}
              className={`warm-card ${index % 2 === 1 ? "bg-peach-hero" : "bg-white"}`}
            >
              <span
                className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-deep-brown text-xs font-bold text-white"
                aria-hidden="true"
              >
                0{index + 1}
              </span>
              <p className="body-copy font-semibold text-text-primary">{card.title}</p>
              <p className="body-copy mt-1 text-sm text-text-primary/70">{card.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
