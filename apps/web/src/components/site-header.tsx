"use client";

import { useState } from "react";
import { SiteLogo } from "@/components/site-logo";
import { PrimaryNav } from "@/components/primary-nav";
import { MobileNavPanel } from "@/components/mobile-nav-panel";
import { IconButton } from "@/components/icon-button";
import {
  SearchIcon,
  HeartIcon,
  UserIcon,
  MenuIcon,
  CloseIcon,
} from "@/components/icons";

export function SiteHeader() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-t border-deep-brown bg-cream-bg">
      <div className="mx-auto flex h-[72px] max-w-[1100px] items-center justify-between px-5 sm:px-8 lg:grid lg:grid-cols-[1fr_auto_1fr]">
        <SiteLogo />

        <PrimaryNav className="hidden lg:block lg:justify-self-center" />

        <div className="hidden items-center gap-2 lg:flex lg:justify-self-end">
          <IconButton label="Search">
            <SearchIcon width={18} height={18} />
          </IconButton>
          <IconButton label="Wishlist">
            <HeartIcon width={18} height={18} />
          </IconButton>
          <IconButton label="Account">
            <UserIcon width={18} height={18} />
          </IconButton>
          <IconButton label="Menu" variant="solid">
            <MenuIcon width={19} height={19} />
          </IconButton>
        </div>

        <button
          type="button"
          onClick={() => setMobileNavOpen((value) => !value)}
          aria-expanded={mobileNavOpen}
          aria-controls="mobile-nav-panel"
          aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-text-primary hover:bg-white/60 lg:hidden"
        >
          {mobileNavOpen ? (
            <CloseIcon width={20} height={20} />
          ) : (
            <MenuIcon width={20} height={20} />
          )}
        </button>
      </div>

      <MobileNavPanel open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
    </header>
  );
}