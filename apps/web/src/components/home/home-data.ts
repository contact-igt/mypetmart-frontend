// Category fixtures live in a shared source (apps/web/src/data/) since Shop's
// filter sidebar and Home's category grid reuse the exact same data.
// Re-exported here so existing Home component imports don't need to change.
//
// Product data for Home's "Loved by pet parents" section is fetched live from
// the real Storefront Product API (see featured-products.tsx) — it no longer
// reads from the mock @/data/products fixture.
export type { HomeCategory } from "@/data/categories";
export { CATEGORIES, CATEGORY_PROMO_TEXT } from "@/data/categories";

export const GROOMING_BULLETS = [
  "Gentle bristles",
  "Fine mist spray",
  "One-click self-clean",
  "Reduces loose hair",
  "Comfortable grip",
  "Everyday grooming",
];

export const GROOMING_DETAILED_BULLETS = [
  "Gentle bristles for daily use",
  "Fine water mist to reduce static",
  "One-click cleaning releases collected hair",
  "Comfortable warm-grip handle",
  "Everyday grooming, minus the mess",
];

export const GROOMING_STEPS = ["Step 1 · Mist", "Step 2 · Brush", "Step 3 · Click"];

export type UspCard = { title: string; description: string };

export const USP_CARDS: UspCard[] = [
  {
    title: "Thoughtfully selected",
    description: "Every product is picked with pet parents in mind.",
  },
  {
    title: "Small-batch curation",
    description: "We test and choose each product ourselves before it's listed.",
  },
  {
    title: "Easy to reach us",
    description: "Questions before you buy? We're just a message away.",
  },
  {
    title: "Built with care",
    description: "Every detail considered, from packaging to product.",
  },
];
