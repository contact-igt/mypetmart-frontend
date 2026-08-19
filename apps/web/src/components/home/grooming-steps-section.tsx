import Image from "next/image";
import Link from "next/link";
import { GROOMING_DETAILED_BULLETS, GROOMING_STEPS } from "./home-data";
import { ArrowRightIcon } from "@/components/icons";

const STEP_TONE_CLASSES = ["bg-white", "bg-yellow-card", "bg-teal-mint-accent"];

export function GroomingStepsSection() {
  return (
    <section className="section-block bg-orange-hero">
      <div className="site-container grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div>
          <span className="pill-label bg-white text-text-primary">Feature story</span>
          <h2 className="display-heading mt-4 text-3xl text-text-primary sm:text-4xl">
            Premium grooming.
            <span className="mt-1 block">
              <span
                className="italic"
                style={{ fontFamily: "var(--font-display-italic)", fontWeight: 500 }}
              >
                Less fur.
              </span>{" "}
              Happier pets.
            </span>
          </h2>
          <p
            className="mt-4 max-w-md italic text-text-primary/85"
            style={{ fontFamily: "var(--font-display-italic)" }}
          >
            A mist-powered grooming brush designed to remove loose hair smoothly — without
            mess, stress or discomfort.
          </p>
          <ul className="body-copy mt-6 flex flex-col gap-2">
            {GROOMING_DETAILED_BULLETS.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-terracotta" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <Link
            href="/shop"
            className="button-primary mt-6 inline-flex items-center gap-2"
          >
            Meet the Grooming Brush <ArrowRightIcon width={16} height={16} />
          </Link>
        </div>
        <div>
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[22px] shadow-sm rotate-2">
            <Image
              src="/assest/grooming-feature.jpg"
              alt="Small dog being groomed with a mist brush, wrapped in a blanket"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {GROOMING_STEPS.map((step, index) => (
              <span
                key={step}
                className={`pill-label text-text-primary ${STEP_TONE_CLASSES[index % STEP_TONE_CLASSES.length]}`}
              >
                {step}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

