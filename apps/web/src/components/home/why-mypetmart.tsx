import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";

const BENEFITS = [
  "Thoughtfully selected everyday essentials",
  "Easy, secure shopping for pet parents",
  "Friendly support when you need us",
];

const TRUST_STATS = [
  { value: "2+", label: "Years in business" },
  { value: "3,000+", label: "Happy customers" },
  { value: "100%", label: "Genuine reviews" },
];

export function WhyMyPetMart() {
  return (
    <section className="section-block overflow-hidden bg-cream-bg">
      <div className="site-container grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16 xl:gap-24">
        <div className="relative grid grid-cols-[0.88fr_1.12fr] items-center gap-4 sm:gap-6">
          <div className="absolute -left-8 top-12 h-32 w-32 rounded-full bg-primary-orange/10 blur-2xl" aria-hidden="true" />
          <div className="relative aspect-[0.52] overflow-hidden rounded-[2rem] bg-peach-hero shadow-[0_20px_45px_rgba(72,39,25,0.14)]">
            <Image
              src="/assest/about-pet-parent-golden-retriever.png"
              alt="Pet parent spending a happy moment with a golden retriever"
              fill
              sizes="(min-width: 1024px) 23vw, 38vw"
              className="object-cover"
            />
          </div>
          <div className="relative mt-20 aspect-[0.75] overflow-hidden rounded-[2rem] bg-mint-sage shadow-[0_20px_45px_rgba(72,39,25,0.1)] sm:mt-24">
            <Image
              src="/assest/grooming-feature.jpg"
              alt="Gentle grooming care for a pet at home"
              fill
              sizes="(min-width: 1024px) 27vw, 48vw"
              className="object-cover"
            />
          </div>
        </div>

        <div className="max-w-[39rem]">
          <span className="eyebrow text-terracotta">About MyPetMart</span>
          <h2
            className="mt-4 text-[2.7rem] leading-[0.98] tracking-[-0.04em] text-text-primary sm:text-[3.8rem]"
            style={{ fontFamily: "var(--font-bagel-fat-one)", fontWeight: 400 }}
          >
            Everything your pet needs, picked with care.
          </h2>
          <p className="mt-6 text-base leading-[1.7] text-text-primary/75 sm:text-lg">
            My Pet Mart is India&apos;s trusted destination for quality pet products and expert
            care. Founded on the belief that pet parents deserve reliable solutions, we&apos;ve
            built a community of satisfied families who trust us with their pets&apos; wellbeing.
            Every product. Every review. Genuinely ours.
          </p>

          <dl className="mt-8 grid grid-cols-3 divide-x divide-text-primary/10 border-y border-text-primary/10 py-5">
            {TRUST_STATS.map((stat) => (
              <div key={stat.label} className="px-3 first:pl-0 last:pr-0 sm:px-5">
                <dt className="text-2xl font-bold leading-none text-terracotta sm:text-3xl">{stat.value}</dt>
                <dd className="mt-1 text-sm font-medium leading-snug text-text-primary/70 sm:text-base">
                  {stat.label}
                </dd>
              </div>
            ))}
          </dl>

          <ul className="mt-7 grid gap-4">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-center gap-3 text-base font-semibold text-text-primary sm:text-lg">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-orange text-white">
                  <Check size={18} strokeWidth={2.5} aria-hidden="true" />
                </span>
                {benefit}
              </li>
            ))}
          </ul>

          <Link href="/shop" className="button-primary motion-press mt-8 px-6">
            Explore pet essentials
          </Link>
        </div>
      </div>
    </section>
  );
}
