import { prefersReducedMotion } from "@/lib/motion";

// anime.js (v4) is loaded on demand, exactly like GSAP in lib/gsap.ts, so it
// never adds to the initial JS that Lighthouse charges to LCP/TBT. Never
// import "animejs" anywhere else.

export type Anime = typeof import("animejs");

let animePromise: Promise<Anime> | null = null;
let loadedAnime: Anime | null = null;

export function loadAnime(): Promise<Anime> {
  animePromise ??= import("animejs").then((module) => (loadedAnime = module));
  return animePromise;
}

/** Runs `run` with anime.js: synchronously once loaded, else after the chunk arrives. */
export function withAnimeLoaded(run: (anime: Anime) => void) {
  if (loadedAnime) run(loadedAnime);
  else loadAnime().then(run).catch(() => undefined);
}

/** Like withAnimeLoaded, but skipped entirely for users who prefer reduced motion. */
export function withAnime(run: (anime: Anime) => void) {
  if (!prefersReducedMotion()) withAnimeLoaded(run);
}
