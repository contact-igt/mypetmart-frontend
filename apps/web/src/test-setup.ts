import "@testing-library/jest-dom/vitest";

// jsdom (30.x) has no HTMLDialogElement.showModal/close — production code uses
// the native API; this only fills the gap for the test environment, the same
// way matchMedia is polyfilled below.
if (typeof window !== "undefined" && window.HTMLDialogElement && !window.HTMLDialogElement.prototype.showModal) {
  window.HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  window.HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement, returnValue?: string) {
    if (!this.open) return;
    this.open = false;
    if (typeof returnValue === "string") this.returnValue = returnValue;
    this.dispatchEvent(new Event("close"));
  };
}

// jsdom (30.x) does not implement Element.prototype.scrollIntoView — production
// code uses the native API to keep an auto-selected thumbnail visible; this only
// fills the test-environment gap.
if (typeof window !== "undefined" && !window.Element.prototype.scrollIntoView) {
  window.Element.prototype.scrollIntoView = function scrollIntoView() {};
}

if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}
