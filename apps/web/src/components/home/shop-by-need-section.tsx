import Image from "next/image";
import Link from "next/link";
import { ProductImagePlaceholder, type PlaceholderTone } from "@/components/image-placeholder";

type NeedCard = {
  title: string;
  description: string;
  href: string;
  imageSrc: string | null;
  imageAlt: string;
  tone: PlaceholderTone;
};

const SHOP_BY_NEED_CARDS: readonly NeedCard[] = [
  {
    title: "Grooming",
    description: "Less fur, more cuddles",
    href: "/shop?category=grooming",
    imageSrc: "/assest/Grooming.png",
    imageAlt: "Dog being groomed",
    tone: "terracotta",
  },
  {
    title: "Walking",
    description: "Confident strides",
    href: "/shop?category=walking-essentials",
    imageSrc: "/assest/Walking Essentials.png",
    imageAlt: "Dogs walking outdoors",
    tone: "orange",
  },
  {
    title: "Paw Care",
    description: "Happier steps",
    href: "/shop?category=paw-care",
    imageSrc: null,
    imageAlt: "",
    tone: "peach",
  },
  {
    title: "Everyday Essentials",
    description: "The daily basics",
    href: "/shop",
    imageSrc: null,
    imageAlt: "",
    tone: "cream",
  },
  {
    title: "Dog Essentials",
    description: "For every good boy",
    href: "/shop?petType=dog",
    imageSrc: "/assest/Dog Essentials.png",
    imageAlt: "Happy puppy playing outdoors",
    tone: "brown",
  },
  {
    title: "Cat Essentials",
    description: "For curious cats",
    href: "/shop?petType=cat",
    imageSrc: null,
    imageAlt: "",
    tone: "mint",
  },
];

export function ShopByNeedSection() {
  return (
    <section className="section-block bg-cream-bg py-14 sm:py-16">
      <div className="site-container">
        <p className="text-sm font-bold uppercase tracking-[0.1em] text-terracotta">Shop by need</p>
        <h2 className="mt-3 text-[2.45rem] leading-[1] tracking-[-0.04em] text-text-primary sm:text-[3.2rem]" style={{ fontFamily: "var(--font-bagel-fat-one)", fontWeight: 400 }}>
          What does your pet need?
        </h2>

        <div aria-label="Shop by need" className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:grid xl:grid-cols-6 xl:overflow-visible xl:pb-0">
          {SHOP_BY_NEED_CARDS.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="group flex w-[180px] shrink-0 snap-start flex-col rounded-[22px] border border-deep-brown/15 bg-white p-4 transition-colors duration-150 hover:border-primary-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30 xl:w-auto"
            >
              <div className="relative aspect-square overflow-hidden rounded-[14px] bg-surface-secondary/35">
                {card.imageSrc ? (
                  <Image src={card.imageSrc} alt={card.imageAlt} fill sizes="(min-width: 1280px) 14vw, 180px" className="object-cover transition-transform duration-150 ease-out group-hover:scale-[1.02]" />
                ) : (
                  <ProductImagePlaceholder label={card.title} tone={card.tone} className="absolute inset-0 h-full w-full rounded-[14px]" iconSize={36} />
                )}
              </div>
              <h3 className="mt-4 text-xl font-bold leading-[1.1] text-text-primary">{card.title}</h3>
              <p className="mt-1 text-sm leading-[1.45] text-text-primary/65">{card.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
