"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Slider, { type Settings } from "react-slick";

const TESTIMONIALS = [
  {
    author: "Simba Moiza",
    quote: "The magic spray brush is amazing—so useful and super soft. It controls hair fall and is approved by Simba Moiza.",
    highlight: "The magic spray brush is amazing",
    toneClass: "bg-white text-text-primary",
    stars: 5,
    expandable: false,
  },
  {
    author: "Arpana Soni",
    quote: "I’m so happy I bought this brushing comb for my pet Rio. It removes broken hair easily, making it the best product for paw parents who have a Husky.",
    highlight: "Best comb for Husky",
    toneClass: "bg-orange-hero text-text-primary",
    stars: 5,
    expandable: false,
  },
  {
    author: "Hanu Aggarwal",
    quote: "Amazing grooming brush—a must-have for pet parents. My dog loves it, and it helps get rid of loose hair really well.",
    highlight: "Best brush to have for pet parents 😇",
    toneClass: "bg-yellow-card text-text-primary",
    stars: 5,
    expandable: false,
  },
  {
    author: "Chintu",
    quote: "It’s surprisingly easy to use, even for someone like me who usually struggles with grooming tools. Chintu wasn’t scared at all and actually seemed to enjoy it! I highly recommend it to anyone looking to upgrade their pet grooming kit.",
    highlight: "Pet steam brush is just amazing 🤩",
    toneClass: "bg-terracotta text-white",
    stars: 5,
    expandable: true,
  },
];

const SLIDER_SETTINGS: Settings = {
  arrows: false,
  autoplay: true,
  autoplaySpeed: 2500,
  cssEase: "cubic-bezier(0.4, 0, 0.2, 1)",
  infinite: true,
  pauseOnFocus: false,
  pauseOnHover: false,
  slidesToScroll: 1,
  slidesToShow: 3,
  speed: 500,
  swipeToSlide: true,
  waitForAnimate: false,
  responsive: [
    { breakpoint: 1024, settings: { slidesToShow: 2 } },
    { breakpoint: 640, settings: { slidesToShow: 1 } },
  ],
};

export function CustomerFeedback() {
  const sliderRef = useRef<Slider>(null);
  const [expandedReview, setExpandedReview] = useState<string | null>(null);

  useEffect(() => {
    sliderRef.current?.slickPlay();
  }, []);

  const showPrevious = () => {
    if (expandedReview) {
      setExpandedReview(null);
      sliderRef.current?.slickPlay();
    }
    sliderRef.current?.slickPrev();
  };

  const showNext = () => {
    if (expandedReview) {
      setExpandedReview(null);
      sliderRef.current?.slickPlay();
    }
    sliderRef.current?.slickNext();
  };

  const toggleReview = (author: string) => {
    const isExpanded = expandedReview === author;
    setExpandedReview(isExpanded ? null : author);
    if (isExpanded) {
      sliderRef.current?.slickPlay();
    } else {
      sliderRef.current?.slickPause();
    }
  };

  return (
    <section className="section-block bg-peach-hero py-16 sm:py-20">
      <div className="site-container">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="pill-label bg-white text-text-primary">Real pet parents</span>
            <h2 className="display-heading mt-4 text-3xl text-text-primary sm:text-4xl">
              Real pet parents.
              <span className="accent ml-2">Real happy tails.</span>
            </h2>
            <p className="body-copy mt-3 max-w-lg text-text-primary/80">
              See what loving pet owners across India have to say about their favourite My Pet Mart essentials.
            </p>
          </div>

          <div className="flex shrink-0 justify-end gap-2">
            <button
              type="button"
              aria-label="Previous testimonial"
              onClick={showPrevious}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-deep-brown bg-white text-deep-brown transition-colors hover:bg-deep-brown hover:text-white"
            >
              <ArrowLeft size={20} strokeWidth={1.8} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Next testimonial"
              onClick={showNext}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-deep-brown bg-white text-deep-brown transition-colors hover:bg-deep-brown hover:text-white"
            >
              <ArrowRight size={20} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="testimonial-slider mt-8">
          <Slider ref={sliderRef} {...SLIDER_SETTINGS}>
            {TESTIMONIALS.map((item) => {
              const isExpanded = expandedReview === item.author;

              return (
                <article
                  key={item.author}
                  className={`warm-card flex h-[16rem] min-h-[16rem] flex-col justify-between overflow-hidden rounded-[22px] p-6 shadow-sm ${item.toneClass}`}
                >
                  <div>
                    <div className="flex items-center gap-1 text-amber-500" aria-label={`${item.stars} out of 5 stars`}>
                      {Array.from({ length: item.stars }).map((_, i) => (
                        <span key={i} className="text-sm" aria-hidden="true">★</span>
                      ))}
                    </div>
                    <h3 className="mt-2 text-base font-bold tracking-tight">
                      &ldquo;{item.highlight}&rdquo;
                    </h3>
                    <p
                      className={`mt-3 text-sm italic leading-relaxed ${
                        item.toneClass.includes("text-white") ? "text-white/90" : "text-text-primary/85"
                      } ${isExpanded ? "max-h-20 overflow-y-auto pr-2" : "line-clamp-3"}`}
                      style={{ fontFamily: "var(--font-display-italic)" }}
                    >
                      &ldquo;{item.quote}&rdquo;
                    </p>
                    {item.expandable && (
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        onClick={() => toggleReview(item.author)}
                        className="mt-2 text-xs font-bold underline underline-offset-4"
                      >
                        {isExpanded ? "Show less" : "Read more"}
                      </button>
                    )}
                  </div>

                  <div className="mt-3 border-t border-current/10 pt-3">
                    <p className="text-xs font-bold">{item.author}</p>
                  </div>
                </article>
              );
            })}
          </Slider>
        </div>
      </div>
    </section>
  );
}
