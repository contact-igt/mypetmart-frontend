// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DownloadReceiptButton } from "./download-receipt-button";
import type { BinaryDownload } from "@/lib/auth/auth-api";

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:mock-url");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
  vi.restoreAllMocks();
});

function pdfDownload(filename: string | null = "REC-000001.pdf"): BinaryDownload {
  return { blob: new Blob(["%PDF-1.4"], { type: "application/pdf" }), filename };
}

describe("DownloadReceiptButton", () => {
  it("is visible with the expected label", () => {
    render(<DownloadReceiptButton download={() => Promise.resolve(pdfDownload())} />);
    expect(screen.getByRole("button", { name: "Download Receipt" })).toBeInTheDocument();
  });

  it("shows a loading state while the download is in flight, then returns to idle", async () => {
    let resolveDownload: (value: BinaryDownload) => void = () => undefined;
    const download = vi.fn(() => new Promise<BinaryDownload>((resolve) => { resolveDownload = resolve; }));

    render(<DownloadReceiptButton download={download} />);
    fireEvent.click(screen.getByRole("button", { name: "Download Receipt" }));

    expect(await screen.findByRole("button", { name: "Preparing..." })).toBeDisabled();

    resolveDownload(pdfDownload());
    await waitFor(() => expect(screen.getByRole("button", { name: "Download Receipt" })).toBeEnabled());
  });

  it("triggers a browser download via an object URL on success", async () => {
    const download = vi.fn(() => Promise.resolve(pdfDownload("REC-000042.pdf")));
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    render(<DownloadReceiptButton download={download} />);
    fireEvent.click(screen.getByRole("button", { name: "Download Receipt" }));

    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1));
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("shows an inline error and stays usable when the download fails", async () => {
    const download = vi.fn(() => Promise.reject(new Error("network down")));

    render(<DownloadReceiptButton download={download} />);
    fireEvent.click(screen.getByRole("button", { name: "Download Receipt" }));

    expect(await screen.findByText(/couldn.t download the receipt/iu)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download Receipt" })).toBeEnabled();
  });
});
