import AOS from "aos";
import "aos/dist/aos.css";

// Only ever reached through the dynamic import in lib/aos.ts, so AOS and its
// stylesheet stay out of the initial page JS/CSS.
export function initAos() {
  AOS.init({ duration: 600, easing: "ease-out-cubic", once: true, offset: 40 });
  return AOS;
}
