/**
 * Real customer testimonial video clips — client-supplied, generic across
 * the catalog (not tied to a specific product). Shared by the Home
 * testimonial carousel and Product Detail's testimonials section so both
 * read from one list instead of two copies drifting apart.
 */
export const TESTIMONIAL_VIDEOS: string[] = Array.from(
  { length: 8 },
  (_, index) => `/assest/testimonial${index + 1}.mp4`,
);
