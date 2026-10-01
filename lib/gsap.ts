import { prefersReducedMotion } from "@/lib/motion";

// GSAP is loaded on demand (a separate chunk fetched on first use) so it never
// adds to the initial JS that Lighthouse charges to LCP/TBT. Never import
// "gsap" (or @gsap/react, which imports it eagerly) anywhere else.

export type Gsap = typeof import("gsap").gsap;

let gsapPromise: Promise<Gsap> | null = null;
let loadedGsap: Gsap | null = null;

export function loadGsap(): Promise<Gsap> {
  gsapPromise ??= import("gsap").then((module) => (loadedGsap = module.gsap));
  return gsapPromise;
}

/** Runs `run` with GSAP: synchronously once loaded, else after the chunk arrives. */
export function withGsap(run: (gsap: Gsap) => void) {
  if (loadedGsap) run(loadedGsap);
  else loadGsap().then(run).catch(() => undefined);
}

/** Like withGsap, but skipped entirely for users who prefer reduced motion. */
export function withMotion(run: (gsap: Gsap) => void) {
  if (!prefersReducedMotion()) withGsap(run);
}
