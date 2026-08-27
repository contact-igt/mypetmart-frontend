"use client";

// Static, read-only star display — used for review cards and the compact
// above-the-fold rating badge. Not interactive; see StarRatingInput for the
// accessible write-a-review control.
export function StaticStars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          width={size}
          height={size}
          viewBox="0 0 20 20"
          fill={star <= Math.round(rating) ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
          className={star <= Math.round(rating) ? "text-primary-orange" : "text-border-subtle"}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1 1 5.8L10 14.9l-5.21 2.62 1-5.8-4.21-4.1 5.82-.85L10 1.5Z"
          />
        </svg>
      ))}
    </span>
  );
}

// Accessible 1-5 star input — a real radio group, keyboard-navigable, never
// purely decorative/mouse-only (see CLAUDE.md Written Product Reviews §35).
export function StarRatingInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="flex items-center gap-1" disabled={disabled}>
      <legend className="sr-only">Rating</legend>
      {[1, 2, 3, 4, 5].map((star) => (
        <label key={star} className="cursor-pointer">
          <input
            type="radio"
            name="review-rating"
            value={star}
            checked={value === star}
            onChange={() => onChange(star)}
            className="peer sr-only"
          />
          <svg
            width={28}
            height={28}
            viewBox="0 0 20 20"
            fill={star <= value ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
            className={`transition-colors duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-orange peer-focus-visible:ring-offset-2 rounded ${
              star <= value ? "text-primary-orange" : "text-border-subtle"
            }`}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1 1 5.8L10 14.9l-5.21 2.62 1-5.8-4.21-4.1 5.82-.85L10 1.5Z"
            />
          </svg>
          <span className="sr-only">{star} star{star === 1 ? "" : "s"}</span>
        </label>
      ))}
    </fieldset>
  );
}
