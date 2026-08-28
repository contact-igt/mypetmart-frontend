"use client";

import { PlayableVideoCard } from "@/components/playable-video-card";

export function TestimonialVideoPlayer({ src, label, poster, className = "" }: { src: string; label: string; poster?: string | null; className?: string }) {
  return (
    <div className={`group relative overflow-hidden rounded-t-2xl bg-deep-brown ${className}`}>
      <PlayableVideoCard
        src={src}
        label={label}
        poster={poster}
        chrome={false}
        aspect="aspect-[9/12]"
        className="rounded-none"
      />
      <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 inline-flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 pl-0.5 text-deep-brown shadow-md transition-transform duration-200 group-hover:scale-105">
        ▶
      </span>
    </div>
  );
}
