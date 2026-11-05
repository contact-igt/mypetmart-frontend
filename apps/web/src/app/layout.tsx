import type { Metadata } from "next";
import { Suspense } from "react";
import { preload } from "react-dom";
import { AnnouncementBar } from "@/components/announcement-bar";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ScrollProgressBar } from "@/components/scroll-progress-bar";
import "slick-carousel/slick/slick.css";
import "./globals.css";

// Baloo 2 is self-hosted (see the @font-face rules in globals.css, which also
// define --font-baloo). Preload the Latin subset, as next/font did.
const BALOO_LATIN_FONT_URL = "/fonts/baloo2/baloo2-latin.woff2";

export const metadata: Metadata = {
  title: "MyPetMart",
  description: "Thoughtfully selected pet-care essentials.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

import { Providers } from "./providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  preload(BALOO_LATIN_FONT_URL, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });

  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <ScrollProgressBar />
          <AnnouncementBar />
          <Suspense fallback={null}>
            <SiteHeader />
          </Suspense>
          {children}
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
