// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ReviewCard } from "./review-card";
import type { StorefrontReviewFeedItem } from "@/types/review";

const base: StorefrontReviewFeedItem = {
  id: 1,
  rating: 5,
  title: "Excellent quality",
  review: "Short and sweet.",
  customerName: "Priya S.",
  verifiedPurchase: true,
  createdAt: "2026-11-15T12:00:00.000Z",
  product: { id: 7, name: "Daily Brush", slug: "daily-brush", image: null },
};

// jsdom computes no layout — force the clamp overflow state per test.
function setOverflow(scrollHeight: number, clientHeight: number) {
  Object.defineProperty(HTMLElement.prototype, "scrollHeight", { configurable: true, get: () => scrollHeight });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => clientHeight });
}

const longBody = `STARTMARK ${"middle ".repeat(50)}ENDMARK`;

afterEach(() => {
  setOverflow(0, 0);
  document.body.style.overflow = "";
});

describe("ReviewCard — review date", () => {
  it("1. shows the admin reviewDate instead of createdAt", () => {
    render(<ReviewCard review={{ ...base, reviewDate: "2026-08-14" }} />);
    expect(screen.getByText("14 Aug 2026")).toBeInTheDocument();
    expect(screen.queryByText("15 Nov 2026")).not.toBeInTheDocument();
  });

  it("2. falls back to createdAt when reviewDate is null", () => {
    render(<ReviewCard review={{ ...base, reviewDate: null }} />);
    expect(screen.getByText("15 Nov 2026")).toBeInTheDocument();
  });

  it("3. DATEONLY formatting does not shift the day (no timezone parsing)", () => {
    render(<ReviewCard review={{ ...base, reviewDate: "2026-01-01" }} />);
    expect(screen.getByText("1 Jan 2026")).toBeInTheDocument();
    expect(screen.queryByText("31 Dec 2025")).not.toBeInTheDocument();
  });
});

describe("ReviewCard — clamps", () => {
  it("4. title uses a two-line clamp", () => {
    const { container } = render(<ReviewCard review={base} />);
    expect(container.querySelector("h3")).toHaveClass("line-clamp-2");
  });

  it("5. body uses a four-line clamp", () => {
    render(<ReviewCard review={base} />);
    expect(screen.getByText("Short and sweet.")).toHaveClass("line-clamp-4");
  });
});

describe("ReviewCard — Read more", () => {
  it("6. a non-overflowing body renders no Read more", () => {
    setOverflow(80, 80);
    render(<ReviewCard review={base} />);
    expect(screen.queryByRole("button", { name: "Read more" })).not.toBeInTheDocument();
  });

  it("7. an overflowing body renders Read more", () => {
    setOverflow(400, 96);
    render(<ReviewCard review={{ ...base, review: longBody }} />);
    expect(screen.getByRole("button", { name: "Read more" })).toBeInTheDocument();
  });

  it("8-10. Read more opens a dialog with the full untruncated review, rating, name, verified badge and date", () => {
    setOverflow(400, 96);
    render(<ReviewCard review={{ ...base, review: longBody, reviewDate: "2026-08-14" }} />);

    fireEvent.click(screen.getByRole("button", { name: "Read more" }));

    const dialog = document.querySelector("dialog") as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    const scoped = within(dialog);

    const body = scoped.getByText(/STARTMARK/);
    expect(body.textContent).toContain("ENDMARK"); // complete, not clamped
    expect(body).not.toHaveClass("line-clamp-4");
    expect(scoped.getByText("Priya S.")).toBeInTheDocument();
    expect(scoped.getByText("✓ Verified purchase")).toBeInTheDocument();
    expect(scoped.getByText("14 Aug 2026")).toBeInTheDocument();
    expect(scoped.getByLabelText("5 out of 5 stars")).toBeInTheDocument();
  });

  it("11. the close button closes (unmounts) the dialog", () => {
    setOverflow(400, 96);
    render(<ReviewCard review={{ ...base, review: longBody }} />);
    fireEvent.click(screen.getByRole("button", { name: "Read more" }));
    expect(document.querySelector("dialog")).toBeInTheDocument();

    fireEvent.click(within(document.querySelector("dialog") as HTMLElement).getByRole("button", { name: "Close review" }));
    expect(document.querySelector("dialog")).not.toBeInTheDocument();
  });

  it("12. native cancel (Escape) closes the dialog", () => {
    setOverflow(400, 96);
    render(<ReviewCard review={{ ...base, review: longBody }} />);
    fireEvent.click(screen.getByRole("button", { name: "Read more" }));
    const dialog = document.querySelector("dialog") as HTMLDialogElement;

    fireEvent(dialog, new Event("cancel"));
    expect(document.querySelector("dialog")).not.toBeInTheDocument();
  });

  it("13. closing restores focus to the Read more button", () => {
    setOverflow(400, 96);
    render(<ReviewCard review={{ ...base, review: longBody }} />);
    const trigger = screen.getByRole("button", { name: "Read more" });
    fireEvent.click(trigger);

    fireEvent.click(within(document.querySelector("dialog") as HTMLElement).getByRole("button", { name: "Close review" }));
    expect(document.activeElement).toBe(trigger);
  });

  it("14. two cards each open their own review, not another card's", () => {
    setOverflow(400, 96);
    const a: StorefrontReviewFeedItem = { ...base, id: 1, title: "First card title", review: `CARDA_BODY ${"x ".repeat(50)}` };
    const b: StorefrontReviewFeedItem = { ...base, id: 2, title: "Second card title", review: `CARDB_BODY ${"y ".repeat(50)}` };
    render(
      <>
        <ReviewCard review={a} />
        <ReviewCard review={b} />
      </>
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Read more" })[1]);

    const scoped = within(document.querySelector("dialog") as HTMLElement);
    expect(scoped.getByText(/CARDB_BODY/)).toBeInTheDocument();
    expect(scoped.getByRole("heading", { name: "Second card title" })).toBeInTheDocument();
    expect(scoped.queryByText(/CARDA_BODY/)).not.toBeInTheDocument();
  });

  it("clicking the dialog backdrop closes it; clicking the content does not", () => {
    setOverflow(400, 96);
    render(<ReviewCard review={{ ...base, review: longBody }} />);
    fireEvent.click(screen.getByRole("button", { name: "Read more" }));
    const dialog = document.querySelector("dialog") as HTMLDialogElement;

    fireEvent.click(within(dialog).getByText(/STARTMARK/));
    expect(document.querySelector("dialog")).toBeInTheDocument();

    fireEvent.click(dialog);
    expect(document.querySelector("dialog")).not.toBeInTheDocument();
  });
});
