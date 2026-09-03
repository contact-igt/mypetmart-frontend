// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PdpGallery } from "./pdp-gallery";
import type { ProductImage } from "@/types/storefront";

function img(id: number, over: Partial<ProductImage> = {}): ProductImage {
  return {
    id,
    url: `https://r2.example.com/img-${id}.jpg`,
    alt: `Image ${id}`,
    contentType: "image/jpeg",
    sizeBytes: 1000,
    width: 800,
    height: 800,
    sortOrder: id,
    isPrimary: id === 1,
    ...over,
  };
}

const THREE = [img(1), img(2), img(3)];

function renderGallery(props: Partial<Parameters<typeof PdpGallery>[0]> = {}) {
  const images = props.images ?? THREE;
  return render(
    <PdpGallery
      images={images}
      primaryImage={props.primaryImage ?? images[0] ?? null}
      productName="Comfort Collar"
      tone="terracotta"
      isOutOfStock={props.isOutOfStock ?? false}
      onImageChange={props.onImageChange}
    />
  );
}

const badge = (n: number, total = 3) => screen.getByText(`${n} / ${total}`);
const thumb = (n: number) => screen.getByRole("button", { name: `View product image ${n}` });

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("PdpGallery — selection & sync", () => {
  it("1. renders the first image initially", () => {
    renderGallery();
    expect(badge(1)).toBeInTheDocument();
    expect(thumb(1)).toHaveAttribute("aria-current", "true");
  });

  it("2 & 3. clicking a thumbnail changes the main image and moves the active thumbnail", () => {
    renderGallery();
    fireEvent.click(thumb(2));
    expect(badge(2)).toBeInTheDocument();
    expect(thumb(2)).toHaveAttribute("aria-current", "true");
    expect(thumb(1)).not.toHaveAttribute("aria-current");
  });

  it("11. an initial variant/primary image other than the first selects that image", () => {
    renderGallery({ primaryImage: img(3) });
    expect(badge(3)).toBeInTheDocument();
    expect(thumb(3)).toHaveAttribute("aria-current", "true");
  });
});

describe("PdpGallery — auto rotation", () => {
  it("4 & 5. autoplay advances the main image and the active thumbnail after the interval", () => {
    renderGallery();
    act(() => vi.advanceTimersByTime(4500));
    expect(badge(2)).toBeInTheDocument();
    expect(thumb(2)).toHaveAttribute("aria-current", "true");
  });

  it("6. autoplay loops from the last image back to the first", () => {
    renderGallery();
    act(() => vi.advanceTimersByTime(4500)); // -> 2
    act(() => vi.advanceTimersByTime(4500)); // -> 3
    expect(badge(3)).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(4500)); // -> 1
    expect(badge(1)).toBeInTheDocument();
  });

  it("7 & 31. a manual thumbnail click resets the autoplay timer to a full interval", () => {
    renderGallery();
    act(() => vi.advanceTimersByTime(3000));
    fireEvent.click(thumb(2)); // manual pick at t=3000
    act(() => vi.advanceTimersByTime(4000)); // 4000 < 4500 since the pick
    expect(badge(2)).toBeInTheDocument(); // not advanced yet
    act(() => vi.advanceTimersByTime(600));
    expect(badge(3)).toBeInTheDocument(); // full interval elapsed -> advance
  });

  it("10 & 24. a single-image product never autoplays and shows no arrows or counter", () => {
    renderGallery({ images: [img(1)], primaryImage: img(1) });
    expect(screen.queryByText(/\d+ \/ \d+/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next product image" })).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(20000));
    // still the same single image, nothing threw
    expect(screen.getByAltText("Image 1")).toBeInTheDocument();
  });
});

describe("PdpGallery — manual controls", () => {
  it("8. the Next control advances the image", () => {
    renderGallery();
    fireEvent.click(screen.getByRole("button", { name: "Next product image" }));
    expect(badge(2)).toBeInTheDocument();
  });

  it("9. the Previous control wraps from the first image to the last", () => {
    renderGallery();
    fireEvent.click(screen.getByRole("button", { name: "Previous product image" }));
    expect(badge(3)).toBeInTheDocument();
  });

  it("arrow interaction also resets the autoplay timer", () => {
    renderGallery();
    act(() => vi.advanceTimersByTime(3000));
    fireEvent.click(screen.getByRole("button", { name: "Next product image" })); // -> 2 at t=3000
    act(() => vi.advanceTimersByTime(4000));
    expect(badge(2)).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(600));
    expect(badge(3)).toBeInTheDocument();
  });
});

describe("PdpGallery — pause behaviour", () => {
  it("14 & 15. hovering the gallery pauses autoplay; leaving resumes it", () => {
    const { container } = renderGallery();
    const root = container.firstElementChild as HTMLElement;

    fireEvent.mouseEnter(root);
    act(() => vi.advanceTimersByTime(9000));
    expect(badge(1)).toBeInTheDocument(); // paused

    fireEvent.mouseLeave(root);
    act(() => vi.advanceTimersByTime(4500));
    expect(badge(2)).toBeInTheDocument(); // resumed with a fresh interval
  });

  it("16. a hidden document pauses autoplay; becoming visible resumes it", () => {
    const hiddenSpy = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    renderGallery();
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    act(() => vi.advanceTimersByTime(9000));
    expect(badge(1)).toBeInTheDocument(); // paused while hidden

    hiddenSpy.mockReturnValue(false);
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    act(() => vi.advanceTimersByTime(4500));
    expect(badge(2)).toBeInTheDocument();
  });

  it("keyboard focus within the gallery pauses autoplay", () => {
    renderGallery();
    fireEvent.focus(thumb(2));
    act(() => vi.advanceTimersByTime(9000));
    expect(badge(1)).toBeInTheDocument();
  });
});

describe("PdpGallery — lifecycle & resilience", () => {
  it("13. auto-selecting an off-screen thumbnail scrolls only the thumbnail rail", () => {
    const scrollIntoViewSpy = vi.spyOn(Element.prototype, "scrollIntoView");
    const pageScrollSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const { container } = renderGallery();
    const rail = container.querySelector("[class*='overflow-x-auto']") as HTMLDivElement;
    const selectedThumbnail = thumb(2);
    const railScrollSpy = vi.fn();

    vi.spyOn(rail, "getBoundingClientRect").mockReturnValue({
      top: 0,
      right: 100,
      bottom: 100,
      left: 0,
      width: 100,
      height: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    vi.spyOn(selectedThumbnail, "getBoundingClientRect").mockReturnValue({
      top: 120,
      right: 64,
      bottom: 184,
      left: 0,
      width: 64,
      height: 64,
      x: 0,
      y: 120,
      toJSON: () => ({}),
    });
    Object.defineProperty(rail, "scrollTo", { configurable: true, value: railScrollSpy });

    act(() => vi.advanceTimersByTime(4500));

    expect(railScrollSpy).toHaveBeenCalledWith({ top: 84, left: 0, behavior: "smooth" });
    expect(scrollIntoViewSpy).not.toHaveBeenCalled();
    expect(pageScrollSpy).not.toHaveBeenCalled();
  });

  it("does not scroll the rail when the active thumbnail is already visible", () => {
    const { container } = renderGallery();
    const rail = container.querySelector("[class*='overflow-x-auto']") as HTMLDivElement;
    const selectedThumbnail = thumb(2);
    const railScrollSpy = vi.fn();

    vi.spyOn(rail, "getBoundingClientRect").mockReturnValue({
      top: 0,
      right: 100,
      bottom: 100,
      left: 0,
      width: 100,
      height: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    vi.spyOn(selectedThumbnail, "getBoundingClientRect").mockReturnValue({
      top: 10,
      right: 64,
      bottom: 74,
      left: 0,
      width: 64,
      height: 64,
      x: 0,
      y: 10,
      toJSON: () => ({}),
    });
    Object.defineProperty(rail, "scrollTo", { configurable: true, value: railScrollSpy });

    act(() => vi.advanceTimersByTime(4500));

    expect(railScrollSpy).not.toHaveBeenCalled();
  });

  it("12 & 17. a new product resets to its first image, and autoplay continues from there", () => {
    const { rerender } = renderGallery();
    fireEvent.click(thumb(3));
    expect(badge(3)).toBeInTheDocument();

    const next = [img(10), img(11)];
    rerender(
      <PdpGallery images={next} primaryImage={next[0]!} productName="Other" tone="terracotta" isOutOfStock={false} />
    );
    expect(screen.getByText("1 / 2")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(4500));
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
  });

  it("17b. unmounting clears the autoplay timer (no post-unmount work)", () => {
    const { unmount } = renderGallery();
    unmount();
    expect(() => act(() => vi.advanceTimersByTime(30000))).not.toThrow();
  });

  it("18. a broken main image falls back to the placeholder and autoplay skips it", () => {
    renderGallery();
    // break image 2 (the main image is first in the DOM, ahead of its thumbnail)
    fireEvent.click(thumb(2));
    const broken = screen.getAllByAltText("Image 2")[0]!;
    fireEvent.error(broken);
    expect(screen.getAllByRole("img", { name: "Comfort Collar - Image coming soon" }).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByAltText("Image 2")).not.toBeInTheDocument(); // main no longer shows the broken image

    // from image 2 (broken), autoplay advances to the next usable image (3)
    act(() => vi.advanceTimersByTime(4500));
    expect(badge(3)).toBeInTheDocument();
  });

  it("18b. a product with no images renders the placeholder and does not crash", () => {
    renderGallery({ images: [], primaryImage: null });
    expect(screen.getByRole("img", { name: "Comfort Collar - Image coming soon" })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(20000));
  });

  it("onImageChange fires on manual interaction but not on an autoplay tick", () => {
    const onImageChange = vi.fn();
    renderGallery({ onImageChange });
    act(() => vi.advanceTimersByTime(4500)); // autoplay
    expect(onImageChange).not.toHaveBeenCalled();
    fireEvent.click(thumb(3));
    expect(onImageChange).toHaveBeenCalledTimes(1);
  });
});

describe("PdpGallery — reduced motion", () => {
  it("disables automatic rotation when the user prefers reduced motion", () => {
    const mql = {
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: () => false,
    };
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue(mql));
    renderGallery();
    act(() => vi.advanceTimersByTime(20000));
    expect(badge(1)).toBeInTheDocument(); // never rotated
    vi.unstubAllGlobals();
  });
});
