"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronIcon, HeartIcon } from "@/components/icons";
import { ProductImagePlaceholder, type PlaceholderTone } from "@/components/image-placeholder";
import { PlayableVideoCard, type VideoCardProduct } from "@/components/playable-video-card";
import { TestimonialVideoCard, type TestimonialVideoCardProduct } from "@/components/testimonial-video-card";
import { TESTIMONIAL_VIDEOS } from "@/data/testimonials";
import { useCustomerAuth } from "@/context/customer-auth-context";
import { useWishlist } from "@/context/wishlist-context";
import { useCart } from "@/context/cart-context";
import { AppAuthError } from "@/lib/auth/auth-errors";
import type { ProductDetail, ProductVariant, ProductImage } from "@/types/storefront";

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

// Deterministic (no Math.random/Date — must match between server and client
// render) rotation through the shared testimonial pool, so each product page
// doesn't show the exact same four clips in the exact same order.
function pickProductTestimonials(productId: number, count: number): string[] {
  const offset = productId % TESTIMONIAL_VIDEOS.length;
  return Array.from(
    { length: Math.min(count, TESTIMONIAL_VIDEOS.length) },
    (_, i) => TESTIMONIAL_VIDEOS[(offset + i) % TESTIMONIAL_VIDEOS.length],
  );
}

const formatPrice = (priceVal: number | string) => {
  const num = typeof priceVal === "number" ? priceVal : parseFloat(priceVal);
  return isNaN(num) ? "0" : num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
};

// useLayoutEffect measures and applies the rail height cap before the browser
// paints, so the tall unmeasured list never flashes on screen. It's a no-op
// warning-generating call during SSR, so it falls back to useEffect there.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function ProductDetailClient({ product }: { product: ProductDetail }) {
  const router = useRouter();
  const { status } = useCustomerAuth();
  const { isWishlisted, isPending, add, remove } = useWishlist();
  const { add: addToCart } = useCart();

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedImage, setSelectedImage] = useState<ProductImage | null>(
    product.primaryImage || (product.images && product.images.length > 0 ? product.images[0] : null)
  );
  const [quantity, setQuantity] = useState(1);
  const [brokenImageIds, setBrokenImageIds] = useState<Set<number>>(new Set());

  // Thumbnail rail: vertical slider on desktop, horizontal strip on mobile.
  // Flexbox align-items:stretch alone can't cap the rail to the main image's
  // height — a taller thumbnail list just grows the row instead of scrolling
  // internally — so the main image's rendered height is measured and applied
  // as an explicit cap.
  const mainImageRef = useRef<HTMLDivElement>(null);
  const thumbRailRef = useRef<HTMLDivElement>(null);
  const thumbButtonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const [railMaxHeight, setRailMaxHeight] = useState<number | null>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

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

  // Product-specific Customer Stories (Phase D) — genuine testimonial_video
  // assignments explicitly tied to this Product. Never the generic rotated
  // pool below: when real ones exist for this Product, they take over and
  // the generic section is suppressed to avoid two testimonial-shaped
  // sections back to back.
  const testimonialVideos = product.testimonialVideos ?? [];
  const hasTestimonialVideos = testimonialVideos.length > 0;
  // A variant Product's compareAtPrice belongs to one specific variant — never
  // attach it to the generic "From" starting price shown here (mirrors the
  // same suppression the main price block above already applies before a
  // variant is selected).
  const testimonialCardProduct: TestimonialVideoCardProduct = {
    name: product.name,
    slug: product.slug,
    price: typeof product.price === "number" ? product.price : parseFloat(product.price),
    compareAtPrice: product.hasVariants
      ? null
      : product.compareAtPrice != null
        ? typeof product.compareAtPrice === "number"
          ? product.compareAtPrice
          : parseFloat(product.compareAtPrice)
        : null,
    hasVariants: product.hasVariants,
  };

  const productTestimonials = pickProductTestimonials(product.id, 4);

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

  const handleImageError = (imageId: number) => {
    setBrokenImageIds((prev) => {
      const next = new Set(prev);
      next.add(imageId);
      return next;
    });
  };

  const updateRailScrollState = () => {
    const el = thumbRailRef.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 1);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
  };

  const scrollRail = (direction: "up" | "down") => {
    const el = thumbRailRef.current;
    if (!el) return;
    const amount = el.clientHeight * 0.8 || 160;
    el.scrollBy({ top: direction === "down" ? amount : -amount, behavior: "smooth" });
  };

  // Track the main image's rendered height and cap the rail to it, so extra
  // thumbnails scroll inside the rail instead of growing the page. Measured
  // synchronously before paint (useLayoutEffect) so refreshing never shows a
  // tall list that then visibly collapses down to size.
  useIsomorphicLayoutEffect(() => {
    const el = mainImageRef.current;
    if (!el) return;
    setRailMaxHeight(el.getBoundingClientRect().height);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setRailMaxHeight(entry.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Recompute whether the rail can scroll after the image list changes or
  // the measured cap changes (e.g. on breakpoint/viewport resize).
  useEffect(() => {
    updateRailScrollState();
  }, [product.images, railMaxHeight]);

  // Keep the selected thumbnail visible inside the rail without scrolling the page.
  useEffect(() => {
    if (!selectedImage) return;
    thumbButtonRefs.current.get(selectedImage.id)?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [selectedImage]);

  const handleAddToCart = async () => {
    if (product.hasVariants && !selectedVariant) return;

    setCartStatus("adding");
    setCartError(null);

    try {
      await addToCart(
        product.id,
        quantity,
        product.hasVariants ? selectedVariant?.id : undefined
      );
      setCartStatus("success");
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

  const mainImageToRender = selectedImage;
  const isMainImageBroken = mainImageToRender ? brokenImageIds.has(mainImageToRender.id) : true;

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-8 md:px-12 lg:px-[96px]">
      {/* Breadcrumb */}
      <nav className="text-sm font-medium text-text-muted mb-8 flex flex-wrap items-center gap-2" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-text-primary transition-colors">Home</Link>
        <span className="text-text-muted/40">/</span>
        <Link href="/shop" className="hover:text-text-primary transition-colors">Shop</Link>
        <span className="text-text-muted/40">/</span>
        <Link
          href={`/shop?category=${product.category.slug}`}
          className="hover:text-text-primary transition-colors"
        >
          {product.category.name}
        </Link>
        <span className="text-text-muted/40">/</span>
        <span className="text-text-primary font-medium" aria-current="page">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
        {/* Left Column: Image Gallery */}
        <div className="flex flex-col gap-4 lg:flex-row-reverse lg:items-stretch">
          <div ref={mainImageRef} className="relative aspect-[4/5] overflow-hidden rounded-[26px] bg-[#FFF8EF] border border-border-subtle shadow-[0_10px_22px_rgba(88,51,29,0.02)] lg:flex-1">
            {mainImageToRender && !isMainImageBroken ? (
              <Image
                src={mainImageToRender.url}
                alt={mainImageToRender.alt || product.name}
                fill
                priority
                sizes="(min-width: 1024px) 45vw, 95vw"
                className="object-cover transition-opacity duration-200"
                onError={() => handleImageError(mainImageToRender.id)}
              />
            ) : (
              <ProductImagePlaceholder
                label={product.name}
                tone={tone}
                className="absolute inset-0 h-full w-full"
              />
            )}

            {isOutOfStock && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                <span className="rounded-full bg-white/90 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-text-primary">
                  Out of Stock
                </span>
              </div>
            )}
          </div>

          {/* Thumbnail Navigation */}
          {product.images && product.images.length > 1 && (
            <div
              className="flex flex-col gap-2 lg:w-20 lg:flex-shrink-0 lg:min-h-0 lg:max-h-[75vh]"
              style={railMaxHeight != null ? { maxHeight: `${railMaxHeight}px` } : undefined}
            >
              <button
                type="button"
                onClick={() => scrollRail("up")}
                disabled={!canScrollUp}
                aria-label="Scroll product images up"
                tabIndex={canScrollUp ? 0 : -1}
                className={`hidden shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-white py-1 text-text-primary transition-opacity duration-150 lg:flex ${
                  canScrollUp ? "opacity-100 hover:border-text-primary/40 cursor-pointer" : "pointer-events-none opacity-0"
                }`}
              >
                <ChevronIcon className="h-4 w-4" />
              </button>

              <div
                ref={thumbRailRef}
                onScroll={updateRailScrollState}
                className="flex gap-3 overflow-x-auto py-2 scrollbar-none snap-x snap-mandatory lg:flex-1 lg:min-h-0 lg:flex-col lg:snap-none lg:overflow-x-visible lg:overflow-y-auto lg:py-0"
              >
                {product.images.map((img) => {
                  const isBroken = brokenImageIds.has(img.id);
                  const isSelected = selectedImage ? selectedImage.id === img.id : false;
                  return (
                    <button
                      key={img.id}
                      ref={(el) => {
                        if (el) thumbButtonRefs.current.set(img.id, el);
                        else thumbButtonRefs.current.delete(img.id);
                      }}
                      type="button"
                      onClick={() => {
                        setSelectedImage(img);
                        setCartStatus("idle");
                        setCartError(null);
                      }}
                      aria-label={`View image ${img.sortOrder}`}
                      aria-current={isSelected ? "true" : "false"}
                      className={`relative aspect-square w-20 flex-shrink-0 cursor-pointer overflow-hidden rounded-[14px] border-2 transition-all duration-150 snap-start ${
                        isSelected
                          ? "border-primary-orange shadow-sm"
                          : "border-border-subtle bg-[#FFF8EF] hover:border-text-primary/40"
                      }`}
                    >
                      {isBroken ? (
                        <ProductImagePlaceholder
                          label={product.name}
                          tone={tone}
                          iconSize={16}
                          className="h-full w-full rounded-md"
                        />
                      ) : (
                        <Image
                          src={img.url}
                          alt={img.alt || `Thumbnail ${img.sortOrder}`}
                          fill
                          sizes="80px"
                          className="object-cover"
                          onError={() => handleImageError(img.id)}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => scrollRail("down")}
                disabled={!canScrollDown}
                aria-label="Scroll product images down"
                tabIndex={canScrollDown ? 0 : -1}
                className={`hidden shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-white py-1 text-text-primary transition-opacity duration-150 lg:flex ${
                  canScrollDown ? "opacity-100 hover:border-text-primary/40 cursor-pointer" : "pointer-events-none opacity-0"
                }`}
              >
                <ChevronIcon className="h-4 w-4 rotate-180" />
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Content and Purchase Panel */}
        <div className="flex flex-col">
          {/* Pet type & category context */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-orange bg-[#FFE9D6] px-3 py-1 rounded-full">
              {product.petType === "all" ? "For Dogs & Cats" : `For ${product.petType}s`}
            </span>
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              {product.category.name}
            </span>
          </div>

          {/* Brand */}
          {product.brand && (
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
              {product.brand}
            </p>
          )}

          {/* Title and Wishlist */}
          <div className="flex justify-between items-start gap-4 mb-4">
            <h1
              className="text-3xl sm:text-4xl text-text-primary leading-tight font-medium"
              style={{ fontFamily: "var(--font-display-italic)" }}
            >
              {product.name}
            </h1>
            <button
              type="button"
              aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
              title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
              aria-pressed={wishlisted}
              disabled={wishlistPending}
              onClick={handleWishlistClick}
              className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-all duration-150 cursor-pointer ${
                wishlisted
                  ? "border-terracotta bg-[#FFF0ED] text-terracotta"
                  : "border-border-subtle bg-white text-text-primary hover:border-text-primary/50"
              } disabled:opacity-50`}
            >
              <HeartIcon className="h-5 w-5" fill={wishlisted ? "currentColor" : "none"} />
            </button>
          </div>

          {/* Price Block */}
          <div className="flex items-baseline gap-3 mb-4">
            <span
              className="text-3xl font-bold text-text-primary"
              style={{ fontFamily: "var(--font-bagel-fat-one)", fontWeight: 400 }}
            >
              {product.hasVariants && !selectedVariant ? "From " : ""}₹{formatPrice(currentPrice)}
            </span>
            {hasDiscount && currentComparePrice && (
              <span className="text-lg text-text-muted line-through">
                ₹{formatPrice(currentComparePrice)}
              </span>
            )}
          </div>

          {/* Key Features */}
          {product.features.length > 0 && (
            <div className="mb-6">
              <span className="block text-sm font-semibold text-text-primary mb-2">
                Key Features
              </span>
              <ul className="flex flex-col gap-1.5">
                {product.features.map((feature) => (
                  <li key={feature.id} className="flex items-start gap-2 text-sm text-text-primary/80">
                    <span className="mt-0.5 text-primary-orange" aria-hidden="true">✓</span>
                    <span>{feature.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Stock State */}
          <div className="mb-8" aria-live="polite">
            {product.hasVariants && product.variants.length === 0 ? (
              <span className="inline-flex items-center rounded-lg bg-[#FFF0ED] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-terracotta">
                Product currently unavailable
              </span>
            ) : product.hasVariants && !selectedVariant ? (
              <span className="text-sm text-text-muted italic">
                Choose an option below to view availability.
              </span>
            ) : isOutOfStock ? (
              <span className="inline-flex items-center rounded-lg bg-[#FFF0ED] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-terracotta">
                Out of Stock
              </span>
            ) : (
              <span className="inline-flex items-center rounded-lg bg-[#EDFBF0] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-800">
                In Stock ({selectedVariant ? selectedVariant.stock : product.stock} available)
              </span>
            )}
          </div>

          {/* Variant Selector */}
          {product.hasVariants && product.variants.length > 0 && (
            <div className="mb-8">
              <span className="block text-sm font-semibold text-text-primary mb-3">
                Select Option
              </span>
              <div className="flex flex-wrap gap-3">
                {product.variants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => handleVariantChange(v)}
                      aria-pressed={isSelected}
                      className={`px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? "border-primary-orange bg-[#FFE9D6] text-primary-orange shadow-sm"
                          : "border-border-subtle bg-white text-text-primary hover:border-text-primary/50"
                      }`}
                    >
                      {v.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity Selector & Add to Cart */}
          {!(product.hasVariants && product.variants.length === 0) && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6">
              <div className="flex items-center justify-between border border-border-subtle rounded-xl bg-white p-1 h-12 w-32 shrink-0">
                <button
                  type="button"
                  onClick={handleMinus}
                  disabled={isOutOfStock || (product.hasVariants && !selectedVariant) || quantity <= 1}
                  aria-label="Decrease quantity"
                  className="w-10 h-10 inline-flex items-center justify-center text-text-primary hover:bg-[#FFF8EF] rounded-lg disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer font-bold"
                >
                  -
                </button>
                <span className="w-8 text-center text-sm font-bold text-text-primary" aria-live="polite">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={handlePlus}
                  disabled={isOutOfStock || (product.hasVariants && !selectedVariant) || quantity >= maxQuantity}
                  aria-label="Increase quantity"
                  className="w-10 h-10 inline-flex items-center justify-center text-text-primary hover:bg-[#FFF8EF] rounded-lg disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer font-bold"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={
                  isOutOfStock ||
                  (product.hasVariants && !selectedVariant) ||
                  cartStatus === "adding"
                }
                className="flex-1 h-12 inline-flex items-center justify-center rounded-xl bg-primary-orange hover:bg-terracotta text-white font-semibold text-sm tracking-wide transition-all duration-150 disabled:opacity-40 disabled:hover:bg-primary-orange cursor-pointer"
              >
                {cartStatus === "adding" ? "Adding..." : "Add to Cart"}
              </button>
            </div>
          )}

          {/* Inline Feedback */}
          {cartStatus === "success" && (
            <div className="mb-8 p-4 rounded-xl bg-[#EDFBF0] text-[#1E7F3C] text-sm font-semibold flex items-center gap-2 border border-emerald-100" aria-live="polite">
              <svg className="h-5 w-5 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Added to cart successfully!
            </div>
          )}
          {cartStatus === "error" && cartError && (
            <div className="mb-8 p-4 rounded-xl bg-[#FFF0ED] text-terracotta text-sm font-semibold border border-red-100" aria-live="assertive">
              {cartError}
            </div>
          )}

          {/* Description */}
          {product.description && (
            <div className="border-t border-border-subtle pt-6 mb-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary mb-3">
                Description
              </h2>
              <div className="text-text-muted text-sm leading-relaxed whitespace-pre-line">
                {product.description}
              </div>
            </div>
          )}

          {/* Specifications */}
          <div className="border-t border-border-subtle pt-6 mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary mb-3">
              Specifications
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
              <div className="flex items-baseline gap-1.5">
                <dt className="text-text-muted">SKU:</dt>
                <dd className="text-text-primary font-semibold">{selectedVariant ? selectedVariant.sku : product.sku}</dd>
              </div>
              {(selectedVariant ? selectedVariant.weightGrams : product.weightGrams) && (
                <div className="flex items-baseline gap-1.5">
                  <dt className="text-text-muted">Weight:</dt>
                  <dd className="text-text-primary font-semibold">
                    {selectedVariant ? selectedVariant.weightGrams : product.weightGrams}g
                  </dd>
                </div>
              )}
              {/* Dimensions */}
              {(selectedVariant
                ? selectedVariant.lengthCm && selectedVariant.widthCm && selectedVariant.heightCm
                : product.lengthCm && product.widthCm && product.heightCm) && (
                <div className="flex items-baseline gap-1.5 sm:col-span-2">
                  <dt className="text-text-muted">Dimensions (L x W x H):</dt>
                  <dd className="text-text-primary font-semibold">
                    {selectedVariant
                      ? `${selectedVariant.lengthCm} × ${selectedVariant.widthCm} × ${selectedVariant.heightCm}`
                      : `${product.lengthCm} × ${product.widthCm} × ${product.heightCm}`}{" "}
                    cm
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Tags */}
          {(() => {
            const rawTags = product.tags as unknown;
            let parsedTags: string[] = [];
            if (Array.isArray(rawTags)) {
              parsedTags = rawTags.map((t) => String(t));
            } else if (typeof rawTags === "string" && rawTags.trim()) {
              try {
                const parsed = JSON.parse(rawTags);
                if (Array.isArray(parsed)) {
                  parsedTags = parsed.map((t) => String(t));
                } else {
                  parsedTags = [rawTags];
                }
              } catch {
                if (rawTags.includes(",")) {
                  parsedTags = rawTags.split(",").map((t: string) => t.trim());
                } else {
                  parsedTags = [rawTags.trim()];
                }
              }
            }
            if (parsedTags.length === 0) return null;

            return (
              <div className="border-t border-border-subtle pt-6">
                <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary mb-3">
                  Tags
                </h2>
                <div className="flex flex-wrap gap-2">
                  {parsedTags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-[#FFF8EF] border border-[#E7CFB9] text-text-primary/70 px-3 py-1.5 rounded-full font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {(hasDynamicProductVideos || showLegacyProductMedia) && (
        <section className="mt-16 border-t border-border-subtle pt-12" aria-labelledby="product-media-heading">
          <div className="mb-7 max-w-2xl">
            <span className="pill-label bg-white text-text-primary">See it in action</span>
            <h2
              id="product-media-heading"
              className="mt-4 text-3xl font-medium text-text-primary sm:text-4xl"
              style={{ fontFamily: "var(--font-display-italic)" }}
            >
              Made for real pet moments.
            </h2>
          </div>

          {hasDynamicProductVideos ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {dynamicProductVideos.map((assignment) => (
                <figure
                  key={assignment.id}
                  className="overflow-hidden rounded-[22px] border border-border-subtle bg-white shadow-sm"
                >
                  <video
                    src={assignment.media.publicUrl}
                    controls
                    playsInline
                    preload="metadata"
                    aria-label={assignment.title || "Product video"}
                    className="aspect-video w-full bg-deep-brown object-contain"
                  >
                    Your browser does not support video playback.
                  </video>
                  {(assignment.title || assignment.caption) && (
                    <figcaption className="p-3 sm:p-4">
                      {assignment.title && <p className="text-sm font-semibold text-text-primary">{assignment.title}</p>}
                      {assignment.caption && <p className="mt-1 text-xs text-text-muted">{assignment.caption}</p>}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {legacyProductMedia.map((media) =>
                media.type === "video" ? (
                  <figure key={media.src} className="aspect-[9/16]">
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
                    className="relative aspect-square overflow-hidden rounded-[22px] border border-border-subtle bg-white shadow-sm"
                  >
                    <Image
                      src={media.src}
                      alt={media.alt}
                      fill
                      sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </figure>
                ),
              )}
            </div>
          )}
        </section>
      )}

      {hasTestimonialVideos && (
        <section className="mt-16 border-t border-border-subtle pt-12" aria-labelledby="product-testimonial-heading">
          <div className="mb-7 max-w-2xl">
            <span className="pill-label bg-white text-text-primary">Customer stories</span>
            <h2
              id="product-testimonial-heading"
              className="mt-4 text-3xl font-medium text-text-primary sm:text-4xl"
              style={{ fontFamily: "var(--font-display-italic)" }}
            >
              What pet parents say about this product.
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {testimonialVideos.map((assignment) => (
              <TestimonialVideoCard
                key={assignment.id}
                testimonial={{
                  id: assignment.id,
                  mediaUrl: assignment.media.publicUrl,
                  title: assignment.title,
                  caption: assignment.caption,
                }}
                product={testimonialCardProduct}
                variant="commerce"
              />
            ))}
          </div>
        </section>
      )}

      {!hasTestimonialVideos && (
        <section className="mt-16 border-t border-border-subtle pt-12" aria-labelledby="product-testimonials-heading">
          <div className="mb-7 max-w-2xl">
            <span className="pill-label bg-white text-text-primary">Real pet parents</span>
            <h2
              id="product-testimonials-heading"
              className="mt-4 text-3xl font-medium text-text-primary sm:text-4xl"
              style={{ fontFamily: "var(--font-display-italic)" }}
            >
              Hear from pet parents shopping with us.
            </h2>
            <p className="body-copy mt-3 text-text-muted">
              General customer stories from across My Pet Mart — not reviews of this specific product.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {productTestimonials.map((src, index) => (
              <PlayableVideoCard
                key={src}
                src={src}
                label={`Pet parent testimonial ${index + 1}`}
                caption="Pet parent story"
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
