import Image from "next/image";
import Link from "next/link";
import type { Category } from "@/types/storefront";

function categoryHref(category: Category) {
  if (category.petType === "dog") return "/shop?petType=dog";
  if (category.petType === "cat") return "/shop?petType=cat";
  return `/shop?category=${category.slug}`;
}

export function ShopByPetSection({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;

  return (
    <section className="section-block bg-cream-bg py-14 sm:py-16" aria-labelledby="shop-by-pet-heading">
      <div className="site-container">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.1em] text-terracotta">Shop by pet</p>
          <h2
            id="shop-by-pet-heading"
            className="mt-3 text-[2.4rem] leading-[1] tracking-[-0.04em] text-text-primary sm:text-[3.1rem]"
            style={{ fontFamily: "var(--font-bagel-fat-one)", fontWeight: 400 }}
          >
            Who are you shopping for?
          </h2>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5" aria-label="Shop by pet categories">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={categoryHref(category)}
              className="group relative isolate block min-h-[224px] overflow-hidden rounded-[24px] bg-surface-secondary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/40 focus-visible:ring-offset-4 focus-visible:ring-offset-cream-bg md:min-h-[260px]"
            >
              {category.imageUrl && (
                <Image
                  src={category.imageUrl}
                  alt={category.imageAlt || category.name}
                  fill
                  sizes="(min-width: 768px) 42vw, 100vw"
                  className="object-cover transition-transform duration-150 ease-out md:group-hover:scale-[1.03]"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-deep-brown/95 via-deep-brown/45 to-deep-brown/5" aria-hidden="true" />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                <h3 className="text-[2rem] font-semibold leading-none text-white sm:text-[2.3rem]">{category.name}</h3>
                {category.description && (
                  <p className="mt-2 line-clamp-2 max-w-sm text-xs font-medium leading-[1.45] text-white/85 sm:text-sm">{category.description}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
