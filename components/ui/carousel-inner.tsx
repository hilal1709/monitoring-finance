"use client";

import { A11y, Keyboard, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperInstance } from "swiper";
import "swiper/css";
import "swiper/css/pagination";
import { prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

// Swiper and its CSS live in this chunk only; import <Carousel> from ./carousel.

export type CarouselProps = {
  slides: React.ReactNode[];
  className?: string;
  /** Called with the active index, e.g. to show "Langkah 2 dari 5". */
  onIndexChange?: (index: number) => void;
  /** Receives the Swiper instance for custom prev/next buttons. */
  onReady?: (swiper: SwiperInstance) => void;
  slidesPerView?: number | "auto";
  spaceBetween?: number;
};

export default function CarouselInner({ slides, className, onIndexChange, onReady, slidesPerView = 1, spaceBetween = 16 }: CarouselProps) {
  return (
    <Swiper
      modules={[Pagination, Keyboard, A11y]}
      className={cn("carousel w-full [--swiper-pagination-color:var(--palette-teal)] [--swiper-pagination-bullet-inactive-color:var(--palette-turquoise)]", className)}
      slidesPerView={slidesPerView}
      spaceBetween={spaceBetween}
      speed={prefersReducedMotion() ? 0 : 450}
      pagination={{ clickable: true }}
      keyboard={{ enabled: true }}
      a11y={{ prevSlideMessage: "Sebelumnya", nextSlideMessage: "Berikutnya", paginationBulletMessage: "Ke slide {{index}}" }}
      onSwiper={onReady}
      onSlideChange={(swiper) => onIndexChange?.(swiper.activeIndex)}
    >
      {slides.map((slide, index) => (
        <SwiperSlide key={index} className="pb-8">
          {slide}
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
