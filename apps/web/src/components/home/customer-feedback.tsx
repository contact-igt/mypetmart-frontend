const TESTIMONIALS = [
  {
    author: "Priya & Bruno (Golden Retriever)",
    city: "Bangalore",
    quote: "The mist spray grooming brush made a huge difference. Bruno used to run away during brushing time, now he actually sits patiently and enjoys the gentle steam mist!",
    highlight: "Game changer for daily grooming",
    toneClass: "bg-white text-text-primary",
    stars: 5,
  },
  {
    author: "Kavya S. & Simba",
    city: "Chennai",
    quote: "The dual leash tangle-free design saved our morning walks. Walking two energetic dogs is finally easy!",
    highlight: "Smooth daily walks",
    toneClass: "bg-orange-hero text-text-primary",
    stars: 5,
  },
  {
    author: "Rahul M. & Coco",
    city: "Mumbai",
    quote: "Super quick delivery and authentic packaging. The paw care balm smells gentle and keeps paws soft and healthy.",
    highlight: "Fast delivery & great quality",
    toneClass: "bg-yellow-card text-text-primary",
    stars: 5,
  },
  {
    author: "Sneha & Mochi (Persian Cat)",
    city: "Delhi",
    quote: "Finding high-quality cat essentials in one place was so convenient. Mochi loved the self-cleaning brush immediately.",
    highlight: "Purr-fect experience",
    toneClass: "bg-terracotta text-white",
    stars: 5,
  },
  {
    author: "Anand K. & Rocky",
    city: "Hyderabad",
    quote: "Ordered the walking essentials set. The reflective stitching on the leash gives so much peace of mind for evening walks.",
    highlight: "Safe & sturdy gear",
    toneClass: "bg-white text-text-primary",
    stars: 5,
  },
  {
    author: "Meera D. & Bella",
    city: "Pune",
    quote: "Every product feels thought through with genuine love for pets. Friendly support and great craftsmanship.",
    highlight: "Truly pet-centric store",
    toneClass: "bg-cream-bg border border-border-subtle text-text-primary",
    stars: 5,
  },
];

export function CustomerFeedback() {
  return (
    <section className="section-block bg-peach-hero py-16 sm:py-20">
      <div className="site-container">
        <span className="pill-label bg-white text-text-primary">Real pet parents</span>
        <h2 className="display-heading mt-4 text-3xl text-text-primary sm:text-4xl">
          Real pet parents.
          <span className="accent ml-2">Real happy tails.</span>
        </h2>
        <p className="body-copy mt-3 max-w-lg text-text-primary/80">
          See what loving pet owners across India have to say about their favourite My Pet Mart essentials.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((item, index) => (
            <div
              key={item.author}
              className={`warm-card flex min-h-[12rem] flex-col justify-between rounded-[22px] p-6 shadow-sm ${item.toneClass} ${
                index === 0 ? "lg:row-span-2 lg:min-h-[25rem]" : ""
              }`}
            >
              <div>
                <div className="flex items-center gap-1 text-amber-500">
                  {Array.from({ length: item.stars }).map((_, i) => (
                    <span key={i} className="text-sm">★</span>
                  ))}
                </div>
                <h3 className="mt-2 text-base font-bold tracking-tight">
                  &ldquo;{item.highlight}&rdquo;
                </h3>
                <p
                  className={`mt-3 text-sm italic leading-relaxed ${
                    item.toneClass.includes("text-white") ? "text-white/90" : "text-text-primary/85"
                  }`}
                  style={{ fontFamily: "var(--font-display-italic)" }}
                >
                  &ldquo;{item.quote}&rdquo;
                </p>
              </div>

              <div className="mt-5 border-t border-current/10 pt-3">
                <p className="text-xs font-bold">{item.author}</p>
                <p className="text-[11px] opacity-75">{item.city}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
