"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PlayableVideoCard, type VideoCardProduct } from "@/components/playable-video-card";
import { TestimonialCarousel } from "@/components/testimonials/testimonial-carousel";
import { TestimonialVideoCard, type TestimonialVideoCardProduct } from "@/components/testimonial-video-card";
import { ProductReviewsSection } from "@/components/product-reviews-section";
import { ProductCard } from "@/components/product-card";
import { PdpGallery } from "@/components/pdp/pdp-gallery";
import { PdpPurchasePanel } from "@/components/pdp/pdp-purchase-panel";
import { PdpStickyCta } from "@/components/pdp/pdp-sticky-cta";
import { PdpFeaturesGrid } from "@/components/pdp/pdp-features-grid";
import { PdpInfoTabs } from "@/components/pdp/pdp-info-tabs";
import { PdpFaqAccordion } from "@/components/pdp/pdp-faq-accordion";
import { TESTIMONIAL_VIDEOS } from "@/data/testimonials";
import { useCustomerAuth } from "@/context/customer-auth-context";
import { useWishlist } from "@/context/wishlist-context";
import { useCart } from "@/context/cart-context";
import { AppAuthError } from "@/lib/auth/auth-errors";
import type { ProductDetail, ProductVariant, StorefrontTestimonial } from "@/types/storefront";
import type { PlaceholderTone } from "@/components/image-placeholder";

const TONES: Record<string, PlaceholderTone> = {
  grooming: "terracotta",
  "walking-essentials": "orange",
  "cat-essentials": "mint",
  "paw-care": "peach",
  "dog-essentials": "brown",
};

type ProductMedia = {
  src: string;
  type: "image" | "video";
  alt: string;
};

const GROOMING_MEDIA: ProductMedia[] = Array.from({ length: 4 }, (_, index) => ({
    src: `/assest/grooming_brush_${index + 1}.mp4`,
    type: "video",
    alt: `Mist-powered grooming brush demonstration ${index + 1}`,
}));

const LEASH_MEDIA: ProductMedia[] = Array.from({ length: 3 }, (_, index) => ({
    src: `/assest/2leashes_${index + 1}.mp4`,
    type: "video",
    alt: `Ultimate dual dog leash demonstration ${index + 1}`,
}));

const PAW_PAD_MEDIA: ProductMedia[] = Array.from({ length: 2 }, (_, index) => ({
    src: `/assest/paws_${index + 1}.jpg`,
    type: "image",
    alt: `Dog anti-slip paw pads product view ${index + 1}`,
}));

const PRODUCT_MEDIA: Record<string, ProductMedia[]> = {
  "pet-grooming-brush": GROOMING_MEDIA,
  "mist-powered-pet-grooming-brush": GROOMING_MEDIA,
  "double-leash-double-joy": LEASH_MEDIA,
  "ultimate-dual-dog-leash": LEASH_MEDIA,
  "dog-anti-slip-pads": PAW_PAD_MEDIA,
  "dog-anti-slip-paw-pads": PAW_PAD_MEDIA,
};

const PDP_MEDIA_GRID_CLASS = "mx-auto flex w-full max-w-[68rem] flex-wrap justify-center gap-5";
const PDP_MEDIA_CARD_CLASS = "w-full max-w-[22rem] shrink-0 sm:w-[calc(50%-0.625rem)] sm:max-w-[22rem] lg:w-80 lg:max-w-none xl:w-[21rem]";

function PdpContentBlocks({ product, blocks }: { product: ProductDetail; blocks: ProductDetail["contentBlocks"] }) {
  if (blocks.length === 0) return null;

  return (
    <section className="mt-20 flex flex-col gap-8 sm:mt-24" aria-labelledby="product-content-heading">
      <h2 id="product-content-heading" className="sr-only">More about this product</h2>
      {blocks.map((block, index) => {
        const hasMedia = Boolean(block.media);
        const hasText = Boolean(block.heading || block.description);
        const mediaEl = block.media ? (
          block.media.mediaType === "video" ? (
            <video
              src={block.media.publicUrl}
              controls
              playsInline
              preload="metadata"
              aria-label={block.media.title || block.heading || "Product content video"}
              className="aspect-video w-full rounded-[22px] bg-deep-brown object-contain"
            >
              Your browser does not support video playback.
            </video>
          ) : (
            <div className="relative aspect-video w-full overflow-hidden rounded-[22px] border border-border-subtle bg-[#FFF8EF]">
              <Image
                src={block.media.publicUrl}
                alt={block.media.title || block.heading || product.name}
                fill
                loading="lazy"
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          )
        ) : null;
        const textEl = hasText ? (
          <div className="flex flex-col justify-center gap-3">
            {block.heading && (
              <h3
                className="text-2xl font-medium text-text-primary sm:text-3xl"
                style={{ fontFamily: "var(--font-display-italic)" }}
              >
                {block.heading}
              </h3>
            )}
            {block.description && (
              <p className="text-text-muted text-sm leading-relaxed whitespace-pre-line">
                {block.description}
              </p>
            )}
          </div>
        ) : null;

        if (!hasMedia || !hasText || block.layout === "media_full") {
          return (
            <div key={index} className="flex flex-col gap-6 rounded-[28px] border border-deep-brown/10 bg-white p-4 sm:p-6">
              {mediaEl}
              {textEl}
            </div>
          );
        }

        return (
          <div key={index} className="grid grid-cols-1 gap-6 rounded-[28px] border border-deep-brown/10 bg-white p-4 sm:p-6 lg:grid-cols-2 lg:items-center">
            {block.layout === "media_right" ? (
              <>
                <div className="order-2 lg:order-1">{textEl}</div>
                <div className="order-1 lg:order-2">{mediaEl}</div>
              </>
            ) : (
              <>
                <div className="order-1">{mediaEl}</div>
                <div className="order-2">{textEl}</div>
              </>
            )}
          </div>
        );
      })}
    </section>
  );
}

// Deterministic (no Math.random/Date — must match between server and client
// render) rotation through the shared testimonial pool, so each product page
// doesn't show the exact same four clips in the exact same order.
export function ProductDetailClient({ product, testimonials }: { product: ProductDetail; testimonials?: StorefrontTestimonial[] }) {
  const router = useRouter();
  const { status } = useCustomerAuth();
  const { isWishlisted, isPending, add, remove } = useWishlist();
  const { cart, add: addToCart } = useCart();

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);

  // Cart interaction states
  const [cartStatus, setCartStatus] = useState<"idle" | "adding" | "success" | "error">("idle");
  const [cartError, setCartError] = useState<string | null>(null);

  const productId = product.id;
  const wishlisted = isWishlisted(productId);
  const wishlistPending = isPending(productId);

  const tone = TONES[product.category.slug] || "peach";
  // Dynamic Product Video assignments (Phase B) take priority; the hardcoded
  // PRODUCT_MEDIA map is a legacy fallback for Products not yet migrated to a
  // real Admin video assignment — never rendered alongside the dynamic list.
  const dynamicProductVideos = product.productVideos ?? [];
  const legacyProductMedia = PRODUCT_MEDIA[product.slug] ?? [];
  const hasDynamicProductVideos = dynamicProductVideos.length > 0;
  const showLegacyProductMedia = !hasDynamicProductVideos && legacyProductMedia.length > 0;

  // Enhanced Product Content — the Storefront detail endpoint already returns
  // active blocks only (see product.service.ts's `where: { active: true }`
  // include), so no extra client-side active filtering is needed here.
  const activeContentBlocks = product.contentBlocks ?? [];

  // Product-specific Customer Stories (Phase D) — genuine testimonial_video
  // assignments explicitly tied to this Product. Never the generic rotated
  // pool below: when real ones exist for this Product, they take over and
  // the generic section is suppressed to avoid two testimonial-shaped
  // sections back to back.
  // A variant Product's compareAtPrice belongs to one specific variant — never
  // attach it to the generic "From" starting price shown here (mirrors the
  // same suppression the main price block above already applies before a
  // variant is selected).
  const productTestimonials: StorefrontTestimonial[] = testimonials ?? (product.testimonialVideos?.length
    ? product.testimonialVideos.map((assignment) => ({ id: assignment.id, videoUrl: assignment.media.publicUrl, title: assignment.title, caption: assignment.caption, product: { id: product.id, name: product.name, slug: product.slug, image: product.primaryImage?.url ?? null } }))
    : TESTIMONIAL_VIDEOS.slice(0, 4).map((videoUrl, index) => ({ id: -(index + 1), videoUrl, title: null, caption: "Pet parent story", product: { id: product.id, name: product.name, slug: product.slug, image: product.primaryImage?.url ?? null } })));
  const legacyTestimonialProduct: TestimonialVideoCardProduct = {
    name: product.name,
    slug: product.slug,
    price: Number.parseFloat(product.price),
    compareAtPrice: product.hasVariants ? null : (product.compareAtPrice ? Number.parseFloat(product.compareAtPrice) : null),
    hasVariants: product.hasVariants,
  };

  // "Add to cart" from inside a demo-video lightbox is a fixed quantity-1,
  // no-variant quick-add — separate from the main panel's quantity/variant
  // state above. Only offered for simple products: a video lightbox has no
  // room for a real variant picker, and silently adding the wrong variant
  // would be worse than not offering it.
  const videoCardProduct: VideoCardProduct | undefined = product.hasVariants
    ? undefined
    : {
        name: product.name,
        price: typeof product.price === "number" ? product.price : parseFloat(product.price),
        compareAtPrice:
          product.compareAtPrice != null
            ? typeof product.compareAtPrice === "number"
              ? product.compareAtPrice
              : parseFloat(product.compareAtPrice)
            : null,
        onAddToCart: () => addToCart(product.id, 1),
      };

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (wishlistPending) return;

    if (status !== "authenticated") {
      router.push("/signin");
      return;
    }

    if (wishlisted) {
      void remove(productId);
    } else {
      void add(productId);
    }
  };

  // Safe pricing configuration
  const currentPrice = selectedVariant ? selectedVariant.price : product.price;
  const currentComparePrice = selectedVariant
    ? selectedVariant.compareAtPrice
    : product.hasVariants
    ? null
    : product.compareAtPrice;

  const priceVal = Math.round((typeof currentPrice === "number" ? currentPrice : parseFloat(currentPrice)) * 100);
  const compareVal = currentComparePrice
    ? Math.round((typeof currentComparePrice === "number" ? currentComparePrice : parseFloat(currentComparePrice)) * 100)
    : 0;
  const hasDiscount = currentComparePrice !== null && compareVal > priceVal;

  const isOutOfStock = selectedVariant
    ? selectedVariant.stock === 0
    : product.hasVariants
    ? product.variants.length > 0 && product.variants.every((v) => v.stock === 0)
    : product.stock === 0;

  const maxQuantity = selectedVariant
    ? Math.min(selectedVariant.stock, 20)
    : product.hasVariants
    ? 0
    : Math.min(product.stock, 20);

  // Synchronous render-phase adjustment when the variant changes.
  const [prevVariant, setPrevVariant] = useState<ProductVariant | null>(null);
  if (selectedVariant !== prevVariant) {
    setPrevVariant(selectedVariant);
    if (selectedVariant) {
      const variantMax = Math.min(selectedVariant.stock, 20);
      if (quantity > variantMax) {
        setQuantity(Math.max(1, variantMax));
      }
    }
  }

  const handleMinus = () => {
    setQuantity((q) => Math.max(1, q - 1));
    setCartStatus("idle");
    setCartError(null);
  };

  const handlePlus = () => {
    setQuantity((q) => Math.min(maxQuantity, q + 1));
    setCartStatus("idle");
    setCartError(null);
  };

  const handleVariantChange = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    setCartStatus("idle");
    setCartError(null);
  };

  const resetCartFeedback = () => {
    setCartStatus("idle");
    setCartError(null);
  };

  const handleAddToCart = async (checkout = false) => {
    if (cartStatus === "adding" || isOutOfStock || (product.hasVariants && !selectedVariant)) return;

    if (checkout && cart.items.some((item) =>
      item.productId === product.id &&
      (item.variantId ?? null) === (selectedVariant?.id ?? null) &&
      item.quantity >= 1 && item.available
    )) {
      router.push("/checkout");
      return;
    }

    setCartStatus("adding");
    setCartError(null);

    try {
      await addToCart(
        product.id,
        quantity,
        product.hasVariants ? selectedVariant?.id : undefined
      );
      setCartStatus("success");
      if (checkout) router.push("/checkout");
    } catch (error) {
      setCartStatus("error");
      if (error instanceof AppAuthError) {
        if (error.code === "CART_INSUFFICIENT_STOCK") {
          const available = error.details?.availableQuantity ?? 0;
          setCartError(`Only ${available} unit(s) are currently available.`);
        } else if (error.code === "CART_QUANTITY_LIMIT_EXCEEDED") {
          const limit = error.details?.max ?? 20;
          setCartError(`Cart line quantity cannot exceed ${limit} units.`);
        } else if (error.code === "CART_PRODUCT_NOT_AVAILABLE") {
          setCartError("Product currently unavailable.");
        } else if (error.code === "CART_VARIANT_NOT_AVAILABLE") {
          setCartError("Selected option unavailable.");
        } else {
          setCartError(error.message || "Something went wrong. Please try again.");
        }
      } else {
        const err = error as Error;
        setCartError(err.message || "Something went wrong. Please try again.");
      }
    }
  };

  return (
    <div className="site-container pb-28 pt-5 sm:pt-7 md:pb-20 lg:pb-28">
      {/* Breadcrumb */}
      <nav className="mb-5 flex min-w-0 items-center gap-2 overflow-hidden text-xs font-semibold text-text-muted sm:mb-7 sm:text-sm" aria-label="Breadcrumb">
        <Link href="/" className="shrink-0 transition-colors hover:text-primary-orange">Home</Link>
        <span className="shrink-0 text-text-muted/35" aria-hidden="true">/</span>
        <Link href="/shop" className="shrink-0 transition-colors hover:text-primary-orange">Shop</Link>
        <span className="shrink-0 text-text-muted/35" aria-hidden="true">/</span>
        <Link
          href={`/shop?category=${product.category.slug}`}
          className="shrink-0 transition-colors hover:text-primary-orange"
        >
          {product.category.name}
        </Link>
        <span className="shrink-0 text-text-muted/35" aria-hidden="true">/</span>
        <span className="truncate font-semibold text-text-primary" aria-current="page">{product.name}</span>
      </nav>

      {/* Marketplace-style product overview: image browsing and a focused purchase area. */}
      <section className="overflow-hidden rounded-2xl border border-deep-brown/15 bg-white shadow-[0_8px_24px_rgba(62,35,25,0.06)]">
        <div className="grid items-stretch lg:grid-cols-[minmax(0,1.1fr)_minmax(390px,0.9fr)]">
          <div className="bg-[#FFF9F1] p-3 sm:p-5 lg:p-6 xl:p-8">
            <PdpGallery
              images={product.images ?? []}
              primaryImage={product.primaryImage}
              productName={product.name}
              tone={tone}
              isOutOfStock={isOutOfStock}
              onImageChange={resetCartFeedback}
            />
          </div>

          <div className="border-t border-deep-brown/10 bg-white lg:border-l lg:border-t-0">
            <PdpPurchasePanel
              product={product}
              selectedVariant={selectedVariant}
              onVariantChange={handleVariantChange}
              quantity={quantity}
              onMinus={handleMinus}
              onPlus={handlePlus}
              maxQuantity={maxQuantity}
              isOutOfStock={isOutOfStock}
              currentPrice={currentPrice}
              currentComparePrice={currentComparePrice}
              hasDiscount={hasDiscount}
              cartStatus={cartStatus}
              cartError={cartError}
              onAddToCart={() => handleAddToCart()}
              onBuyNow={() => handleAddToCart(true)}
              wishlisted={wishlisted}
              wishlistPending={wishlistPending}
              onWishlistClick={handleWishlistClick}
            />
          </div>
        </div>
      </section>

      <PdpInfoTabs product={product} selectedVariant={selectedVariant} />

      <PdpFeaturesGrid features={product.features} />

      <ProductReviewsSection productId={product.id} product={{ name: product.name, slug: product.slug, image: product.primaryImage?.url ?? null }} />

      {productTestimonials.length > 0 && (testimonials === undefined ? (
        product.testimonialVideos.length > 0 ? (
          <section className="mt-20 sm:mt-24" aria-labelledby="product-testimonial-heading">
            <div className="mb-7 max-w-2xl">
              <span className="pill-label border border-deep-brown/10 bg-white text-text-primary">Customer stories</span>
              <h2 id="product-testimonial-heading" className="mt-4 text-3xl font-medium text-text-primary sm:text-4xl" style={{ fontFamily: "var(--font-display-italic)" }}>What pet parents say about this product.</h2>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {product.testimonialVideos.map((assignment) => <TestimonialVideoCard key={assignment.id} testimonial={{ id: assignment.id, mediaUrl: assignment.media.publicUrl, title: assignment.title, caption: assignment.caption }} product={legacyTestimonialProduct} variant="commerce" />)}
            </div>
          </section>
        ) : (
          <section className="mt-20 sm:mt-24" aria-labelledby="product-testimonials-heading">
            <div className="mb-7 max-w-2xl"><span className="pill-label border border-deep-brown/10 bg-white text-text-primary">Real pet parents</span><h2 id="product-testimonials-heading" className="mt-4 text-3xl font-medium text-text-primary sm:text-4xl" style={{ fontFamily: "var(--font-display-italic)" }}>Hear from pet parents shopping with us.</h2><p className="body-copy mt-3 text-text-muted">General customer stories from across My Pet Mart — not reviews of this specific product.</p></div>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">{TESTIMONIAL_VIDEOS.slice(0, 4).map((src, index) => <PlayableVideoCard key={src} src={src} label={`Pet parent testimonial ${index + 1}`} caption="Pet parent story" />)}</div>
          </section>
        )
      ) : (
        <section className="mt-20 sm:mt-24" aria-labelledby="product-testimonial-heading">
          <h2 id="product-testimonial-heading" className="sr-only">Customer stories</h2>
          <TestimonialCarousel testimonials={productTestimonials} eyebrow="Customer stories" title="What pet parents say about this product." description="Real experiences from pet parents who chose this product." compact />
        </section>
      ))}

      {(hasDynamicProductVideos || showLegacyProductMedia) && (
        <section className="mt-20 sm:mt-24" aria-labelledby="product-media-heading">
          <div className="mb-7 max-w-2xl">
            <span className="pill-label border border-deep-brown/10 bg-white text-text-primary">See it in action</span>
            <h2
              id="product-media-heading"
              className="mt-4 text-3xl font-medium text-text-primary sm:text-4xl"
              style={{ fontFamily: "var(--font-display-italic)" }}
            >
              Made for real pet moments.
            </h2>
          </div>

          {hasDynamicProductVideos ? (
            <div className={PDP_MEDIA_GRID_CLASS}>
              {dynamicProductVideos.map((assignment) => (
                <figure
                  key={assignment.id}
                  className={`${PDP_MEDIA_CARD_CLASS} overflow-hidden rounded-[22px] border border-border-subtle bg-white shadow-sm`}
                >
                  <video
                    src={assignment.media.publicUrl}
                    controls
                    playsInline
                    preload="metadata"
                    aria-label={assignment.title || "Product video"}
                    className="aspect-[9/12] w-full bg-deep-brown object-cover"
                  >
                    Your browser does not support video playback.
                  </video>
                  <figcaption className="min-h-[4.25rem] p-3 sm:p-4">
                    {assignment.title && <p className="line-clamp-2 text-sm font-semibold text-text-primary">{assignment.title}</p>}
                    {assignment.caption && <p className="mt-1 line-clamp-2 text-xs text-text-muted">{assignment.caption}</p>}
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <div className={PDP_MEDIA_GRID_CLASS}>
              {legacyProductMedia.map((media) =>
                media.type === "video" ? (
                  <figure
                    key={media.src}
                    className={`${PDP_MEDIA_CARD_CLASS} aspect-[9/12]`}
                  >
                    <PlayableVideoCard
                      src={media.src}
                      label={media.alt}
                      aspect="h-full"
                      className="h-full"
                      product={videoCardProduct}
                    />
                  </figure>
                ) : (
                  <figure
                    key={media.src}
                    className={`${PDP_MEDIA_CARD_CLASS} relative aspect-square overflow-hidden rounded-[22px] border border-border-subtle bg-white shadow-sm`}
                  >
                    <div className="absolute inset-5 sm:inset-6">
                      <Image
                        src={media.src}
                        alt={media.alt}
                        fill
                        sizes="(min-width: 1280px) 336px, (min-width: 1024px) 320px, (min-width: 640px) 45vw, 100vw"
                        className="object-contain"
                      />
                    </div>
                  </figure>
                ),
              )}
            </div>
          )}
        </section>
      )}

      <PdpFaqAccordion faqs={product.faqs} />

      {product.relatedProducts.length > 0 && (
        <section className="mt-20 sm:mt-24" aria-labelledby="related-products-heading">
          <div className="mb-7 max-w-2xl">
            <span className="pill-label border border-deep-brown/10 bg-white text-text-primary">Related products</span>
            <h2
              id="related-products-heading"
              className="mt-4 text-3xl font-medium text-text-primary sm:text-4xl"
              style={{ fontFamily: "var(--font-display-italic)" }}
            >
              You may also like.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {product.relatedProducts.map((related) => (
              <ProductCard key={related.id} product={related} />
            ))}
          </div>
        </section>
      )}

      <PdpContentBlocks product={product} blocks={activeContentBlocks} />

      <PdpStickyCta
        product={product}
        selectedVariant={selectedVariant}
        quantity={quantity}
        onMinus={handleMinus}
        onPlus={handlePlus}
        maxQuantity={maxQuantity}
        isOutOfStock={isOutOfStock}
        currentPrice={currentPrice}
        currentComparePrice={currentComparePrice}
        hasDiscount={hasDiscount}
        cartStatus={cartStatus}
        onAddToCart={() => handleAddToCart()}
      />
    </div>
  );
}
