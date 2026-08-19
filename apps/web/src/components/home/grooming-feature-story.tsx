import Image from "next/image";
import Link from "next/link";
import { GROOMING_BULLETS } from "./home-data";
import { ArrowRightIcon } from "@/components/icons";

export function GroomingFeatureStory() {
  return (
    <section className="section-block bg-mint-sage">
      <div className="site-container grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div className="relative aspect-[6/5] w-full overflow-hidden rounded-[24px] shadow-sm">
          <Image
            src="/assest/grooming-story.jpg"
            alt="Puppy and cat being groomed with a mist spray brush on a soft blanket"
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
        <div>
          <span className="eyebrow text-primary-orange">Feature story</span>
          <h2 className="display-heading mt-3 text-3xl text-text-primary sm:text-4xl">
            Premium grooming. Less fur. Happier pets.
          </h2>
          <p className="body-copy mt-4 max-w-md text-text-primary/85">
            A mist-powered grooming brush designed to remove loose hair smoothly — without
            mess, stress or discomfort.
          </p>
          <ul className="body-copy mt-6 grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
            {GROOMING_BULLETS.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary-orange" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <Link
            href="/shop"
            className="mt-6 inline-flex h-[var(--button-height)] items-center gap-2 rounded-full bg-deep-brown px-6 font-semibold text-white transition-colors duration-150 ease-out hover:opacity-90"
          >
            Meet the Grooming Brush <ArrowRightIcon width={16} height={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
