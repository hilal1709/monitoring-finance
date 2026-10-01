// Tiny Web Animations API helper that replaces GSAP (~130 KB of JS on every
// page). Animations run off the main thread where possible and need no
// library code at all. Durations and delays are in seconds, like GSAP's.
//
// Keyframes use the individual transform properties (`translate`, `scale`,
// `rotate`) so concurrent animations on the same element compose instead of
// overwriting each other's `transform`.

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export const ease = {
  out: "cubic-bezier(0.33, 1, 0.68, 1)",
  outStrong: "cubic-bezier(0.22, 1, 0.36, 1)",
  in: "cubic-bezier(0.32, 0, 0.67, 0)",
  inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
  back: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  backStrong: "cubic-bezier(0.34, 2, 0.64, 1)",
  elastic: "linear(0, 0.6 9%, 1.2 20%, 1.08 30%, 0.95 42%, 1.02 58%, 0.99 75%, 1)",
  linear: "linear",
} as const;

export type MotionTargets = Element | null | undefined | ArrayLike<Element> | Iterable<Element>;

export type MotionOptions = {
  duration?: number;
  delay?: number;
  /** Extra delay per target, in seconds. */
  stagger?: number;
  ease?: string;
  iterations?: number;
  direction?: PlaybackDirection;
  /**
   * Keep the final keyframe after the animation ends (written to inline style).
   * Without it the element returns to its CSS state, which suits "from"
   * entrance animations.
   */
  persist?: boolean;
  onComplete?: () => void;
};

function toArray(targets: MotionTargets): Element[] {
  if (!targets) return [];
  if (targets instanceof Element) return [targets];
  return Array.from(targets as ArrayLike<Element>);
}

export function animate(targets: MotionTargets, keyframes: Keyframe[], options: MotionOptions = {}): Animation[] {
  const elements = toArray(targets);
  const { duration = 0.5, delay = 0, stagger = 0, ease: easing = ease.out, iterations = 1, direction = "normal", persist = false, onComplete } = options;

  const animations = elements
    .filter((element) => typeof element.animate === "function")
    .map((element, index) => {
      const animation = element.animate(keyframes, {
        duration: duration * 1000,
        delay: (delay + index * stagger) * 1000,
        easing,
        iterations,
        direction,
        fill: persist ? "both" : "backwards",
      });

      if (persist) {
        animation.finished
          .then(() => {
            try {
              animation.commitStyles();
              animation.cancel();
            } catch {
              // Element left the DOM before finishing; nothing to keep.
            }
          })
          .catch(() => undefined);
      }

      return animation;
    });

  if (onComplete) {
    Promise.all(animations.map((animation) => animation.finished))
      .then(() => onComplete())
      .catch(() => undefined);
  }

  return animations;
}

export function cancelAll(animations: Animation[]) {
  for (const animation of animations) animation.cancel();
}

/** Height of an element's content, for animating to/from `height: auto`. */
export function autoHeight(element: HTMLElement) {
  return `${element.scrollHeight}px`;
}
