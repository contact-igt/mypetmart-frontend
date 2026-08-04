import Image from "next/image";
import Link from "next/link";

/**
 * Uses the supplied brand artwork from public/assest/logo.png. The asset is
 * rendered as a single image so the heart mark and wordmark keep their exact
 * Figma-approved proportions.
 */
export function SiteLogo({
  tone = "brand",
  className,
}: {
  tone?: "brand" | "inverted";
  className?: string;
}) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center ${className ?? ""}`}
      aria-label="My Pet Mart — home"
    
    >
      <Image
        src="/assest/logo.png"
        alt="My Pet Mart"
        width={1332}
        height={276}
        priority
        className={`h-[60px] w-[280px] ${
          tone === "inverted" ? "brightness-0 invert" : ""
        }`}
      />
    </Link>
  );
}