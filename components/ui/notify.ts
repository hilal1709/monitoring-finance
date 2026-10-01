"use client";

// Lightweight toast API. The real toaster (sonner + palette cards, see
// components/ui/sonner.tsx) is only downloaded the first time a toast is
// shown — always after an upload/delete, never during page load.

type Tone = "success" | "error" | "info";

let requested = false;
const listeners = new Set<() => void>();

/** Lets <LazyToaster /> mount the real toaster once the first toast is requested. */
export function onToasterRequested(listener: () => void) {
  if (requested) listener();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

async function show(tone: Tone, title: string, description?: string) {
  if (!requested) {
    requested = true;
    listeners.forEach((listener) => listener());
  }

  const toaster = await import("@/components/ui/sonner");
  // Give <Toaster /> a couple of frames to mount and subscribe before the first toast.
  await nextFrame();
  await nextFrame();
  toaster.notify[tone](title, description);
}

export const notify = {
  success: (title: string, description?: string) => void show("success", title, description),
  error: (title: string, description?: string) => void show("error", title, description),
  info: (title: string, description?: string) => void show("info", title, description),
};
