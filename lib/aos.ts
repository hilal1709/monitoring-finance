import { prefersReducedMotion } from "@/lib/motion";

// AOS (scroll reveal via `data-aos` attributes) is fetched on the first scroll:
// it only animates widgets below the fold, so a page that is never scrolled
// never downloads it. Never import "aos" anywhere else.

type Aos = ReturnType<typeof import("@/lib/aos-init").initAos>;

let aosPromise: Promise<Aos> | null = null;

function whenScrolled() {
  return new Promise<void>((resolve) => {
    if (window.scrollY > 0) return resolve();
    window.addEventListener("scroll", () => resolve(), { once: true, passive: true });
  });
}

/** Starts AOS after the first scroll (no-op for reduced-motion users, whose `data-aos` elements are shown as-is). */
export function loadAos(): Promise<Aos | null> {
  if (typeof window === "undefined" || prefersReducedMotion()) return Promise.resolve(null);
  aosPromise ??= whenScrolled()
    .then(() => import("@/lib/aos-init"))
    .then((module) => module.initAos());
  return aosPromise.catch(() => null);
}

/** Re-scans the page after new `data-aos` elements mount or the layout moves. */
export function refreshAos() {
  aosPromise?.then((aos) => aos.refreshHard()).catch(() => undefined);
}
