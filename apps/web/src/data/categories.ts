import type { PlaceholderTone } from "@/components/image-placeholder";

/**
 * Shared category list — drives the Home category grid and the Shop
 * sidebar's CATEGORY filter, so both pages stay in sync with one source.
 */
export type HomeCategory = {
  label: string;
  eyebrow: string;
  imageLabel: string;
  tone: PlaceholderTone;
  href: string;
};

export const CATEGORIES: HomeCategory[] = [
  {
    label: "Grooming",
    eyebrow: "For softer coats",
    imageLabel: "Small fluffy dog being groomed, wrapped in a blanket",
    tone: "terracotta",
    href: "/shop?category=grooming",
  },
  {
    label: "Walking Essentials",
    eyebrow: "For confident strides",
    imageLabel: "Golden retriever walking on a leash outdoors",
    tone: "orange",
    href: "/shop?category=walking-essentials",
  },
  {
    label: "Cat Essentials",
    eyebrow: "For curious cats",
    imageLabel: "Cat sitting outdoors on a pathway",
    tone: "mint",
    href: "/shop?petType=cat",
  },
  {
    label: "Paw Care",
    eyebrow: "For happier steps",
    imageLabel: "Small dog wearing a paw-care outfit",
    tone: "peach",
    href: "/shop?category=paw-care",
  },
  {
    label: "Dog Essentials",
    eyebrow: "For every good boy",
    imageLabel: "Dog outdoors at sunset",
    tone: "brown",
    href: "/shop?petType=dog",
  },
];

export const CATEGORY_PROMO_TEXT = "Less Fur. More Cuddles.";
