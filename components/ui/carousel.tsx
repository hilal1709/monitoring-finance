"use client";

import dynamic from "next/dynamic";
import type { CarouselProps } from "@/components/ui/carousel-inner";

/** Swipeable slides (Swiper), loaded on first render so it never weighs on page load. */
export const Carousel = dynamic<CarouselProps>(() => import("@/components/ui/carousel-inner"), {
  ssr: false,
  loading: () => <div className="h-64 rounded-xl shimmer" aria-hidden />,
});

export type { CarouselProps };
