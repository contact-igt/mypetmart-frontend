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
        className={`h-[48px] w-auto max-w-[215px] sm:h-[54px] sm:max-w-[245px] lg:h-[58px] lg:max-w-[270px] object-contain ${
          tone === "inverted" ? "brightness-0 invert" : ""
        }`}
      />
    </Link>
  );
}