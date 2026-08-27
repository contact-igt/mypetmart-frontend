import { Suspense } from "react";
import { HeroSection } from "@/components/home/hero-section";
import { CategoryGrid, CategoryGridSkeleton } from "@/components/home/category-grid";
// import { GroomingFeatureStory } from "@/components/home/grooming-feature-story";
import { FeaturedProducts, FeaturedProductsSkeleton } from "@/components/home/featured-products";
import { ShopByNeedSection } from "@/components/home/shop-by-need-section";
import { FeaturedProductSpotlight, FeaturedProductSpotlightSkeleton } from "@/components/home/featured-product-spotlight";
import { WhyMyPetMart } from "@/components/home/why-mypetmart";
import { CustomerFeedback, CustomerFeedbackSkeleton } from "@/components/home/customer-feedback";
import { CustomerReviews, CustomerReviewsSkeleton } from "@/components/home/customer-reviews";

export default function Home() {
  return (
    <main className="flex-1">
      <HeroSection />
      <Suspense fallback={<CategoryGridSkeleton />}>
        <CategoryGrid />
      </Suspense>
      {/* <GroomingFeatureStory /> */}
      <Suspense fallback={<FeaturedProductsSkeleton />}>
        <FeaturedProducts />
      </Suspense>
      <ShopByNeedSection />
      <Suspense fallback={<FeaturedProductSpotlightSkeleton />}>
        <FeaturedProductSpotlight />
      </Suspense>
      <WhyMyPetMart />
      <Suspense fallback={<CustomerFeedbackSkeleton />}>
        <CustomerFeedback />
      </Suspense>
      <Suspense fallback={<CustomerReviewsSkeleton />}>
        <CustomerReviews />
      </Suspense>
    </main>
  );
}
