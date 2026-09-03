// Storefront review date resolution (Stage 3).
//
// A review's public date is `reviewDate ?? createdAt`, but the two are
// different value types:
//   - reviewDate is the backend DATEONLY string "YYYY-MM-DD" (a calendar date,
//     no time, no zone). It is formatted by SPLITTING THE STRING — never via
//     `new Date("YYYY-MM-DD")`, which parses as UTC midnight and renders the
//     previous day in a negative-offset timezone.
//   - createdAt is a real ISO timestamp, formatted with the existing
//     `new Date(iso).toLocaleDateString(...)` behaviour.
// No date library — the platform is enough.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// "2026-08-14" -> "14 Aug 2026". Matches the existing storefront review-date
// style (`{ day: "numeric", month: "short", year: "numeric" }`) with no Date.
export function formatReviewDateOnly(value: string): string | null {
  if (!DATE_ONLY.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const label = MONTHS[month - 1];
  if (!label || day < 1 || day > 31) return null;
  return `${day} ${label} ${year}`;
}

// An ISO timestamp -> "14 Aug 2026" (unchanged from the previous ReviewCard
// `formatReviewDate` behaviour).
export function formatTimestampDate(value: string): string | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export type ReviewDisplayDate = { label: string; machine: string } | null;

// The single effective-date resolver used by both the card and the dialog:
// admin-set reviewDate when present, otherwise the real createdAt. Returns the
// human label plus a machine value for <time dateTime>.
export function resolveReviewDisplayDate(review: { reviewDate?: string | null; createdAt?: string }): ReviewDisplayDate {
  if (review.reviewDate) {
    const label = formatReviewDateOnly(review.reviewDate);
    if (label) return { label, machine: review.reviewDate };
  }
  if (review.createdAt) {
    const label = formatTimestampDate(review.createdAt);
    if (label) return { label, machine: review.createdAt };
  }
  return null;
}
