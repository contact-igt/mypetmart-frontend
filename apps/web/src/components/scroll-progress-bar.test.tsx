// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScrollProgressBar } from "./scroll-progress-bar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

function setScrollGeometry({ scrollY, scrollHeight, innerHeight }: { scrollY: number; scrollHeight: number; innerHeight: number }) {
  Object.defineProperty(window, "scrollY", { value: scrollY, configurable: true, writable: true });
  Object.defineProperty(window, "innerHeight", { value: innerHeight, configurable: true, writable: true });
  Object.defineProperty(document.documentElement, "scrollHeight", { value: scrollHeight, configurable: true });
}

function flushRaf() {
  return act(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ScrollProgressBar", () => {
  it("renders a decorative, non-interactive fixed layer that does not affect layout", () => {
    setScrollGeometry({ scrollY: 0, scrollHeight: 2000, innerHeight: 800 });
    const { container } = render(<ScrollProgressBar />);
    const bar = container.firstElementChild as HTMLElement;

    expect(bar).toHaveAttribute("aria-hidden", "true");
    expect(bar.className).toContain("fixed");
    expect(bar.className).toContain("pointer-events-none");
    expect(bar.className).toContain("origin-left");
    expect(bar.className).toContain("bg-primary-orange");
  });

  it("starts at 0 width when the page is at the top", () => {
    setScrollGeometry({ scrollY: 0, scrollHeight: 2000, innerHeight: 800 });
    const { container } = render(<ScrollProgressBar />);
    expect((container.firstElementChild as HTMLElement).style.transform).toBe("scaleX(0)");
  });

  it("stays at 0 when there is no scrollable content", async () => {
    setScrollGeometry({ scrollY: 0, scrollHeight: 700, innerHeight: 800 });
    const { container } = render(<ScrollProgressBar />);
    await act(async () => {
      window.dispatchEvent(new Event("scroll"));
    });
    await flushRaf();
    expect((container.firstElementChild as HTMLElement).style.transform).toBe("scaleX(0)");
  });

  it("reflects the scroll ratio and reaches full width at the bottom", async () => {
    setScrollGeometry({ scrollY: 0, scrollHeight: 1800, innerHeight: 800 }); // scrollable range = 1000
    const { container } = render(<ScrollProgressBar />);
    const bar = container.firstElementChild as HTMLElement;

    setScrollGeometry({ scrollY: 250, scrollHeight: 1800, innerHeight: 800 });
    await act(async () => window.dispatchEvent(new Event("scroll")));
    await flushRaf();
    expect(bar.style.transform).toBe("scaleX(0.25)");

    setScrollGeometry({ scrollY: 1000, scrollHeight: 1800, innerHeight: 800 });
    await act(async () => window.dispatchEvent(new Event("scroll")));
    await flushRaf();
    expect(bar.style.transform).toBe("scaleX(1)");
  });

  it("clamps overscroll to 1", async () => {
    setScrollGeometry({ scrollY: 5000, scrollHeight: 1800, innerHeight: 800 });
    const { container } = render(<ScrollProgressBar />);
    await act(async () => window.dispatchEvent(new Event("scroll")));
    await flushRaf();
    expect((container.firstElementChild as HTMLElement).style.transform).toBe("scaleX(1)");
  });

  it("recalculates on resize", async () => {
    setScrollGeometry({ scrollY: 500, scrollHeight: 1800, innerHeight: 800 }); // 500 / 1000 = 0.5
    const { container } = render(<ScrollProgressBar />);
    const bar = container.firstElementChild as HTMLElement;
    await flushRaf();
    expect(bar.style.transform).toBe("scaleX(0.5)");

    setScrollGeometry({ scrollY: 500, scrollHeight: 2500, innerHeight: 500 }); // 500 / 2000 = 0.25
    await act(async () => window.dispatchEvent(new Event("resize")));
    await flushRaf();
    expect(bar.style.transform).toBe("scaleX(0.25)");
  });

  it("removes its scroll and resize listeners on unmount", () => {
    setScrollGeometry({ scrollY: 0, scrollHeight: 2000, innerHeight: 800 });
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<ScrollProgressBar />);
    unmount();
    const events = removeSpy.mock.calls.map((call) => call[0]);
    expect(events).toContain("scroll");
    expect(events).toContain("resize");
  });
});
