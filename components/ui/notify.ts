"use client";

import type { ToastAction, ToastOptions, Tone } from "@/components/ui/sonner";

// Lightweight toast API. The real toaster (sonner + palette cards, see
// components/ui/sonner.tsx) is only downloaded the first time a toast is
// shown — always after an upload/delete, never during page load. Only types
// are imported from sonner.tsx, so nothing of it lands in the page bundle.

export type { ToastAction };

/** Options for success/error/info: an action button like "Urungkan", or a custom duration. */
export type NotifyOptions = Pick<ToastOptions, "action" | "duration">;

type Message<T> = string | { title: string; description?: string } | ((value: T) => string | { title: string; description?: string });

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

type Toaster = typeof import("@/components/ui/sonner");

let toasterReady: Promise<Toaster> | null = null;
// Calls run in order, so a dismiss/update never overtakes the toast it targets.
let queue: Promise<unknown> = Promise.resolve();

function run(task: (toaster: Toaster) => void) {
  if (!requested) {
    requested = true;
    listeners.forEach((listener) => listener());
  }
  toasterReady ??= import("@/components/ui/sonner").then(async (toaster) => {
    // Give <Toaster /> a couple of frames to mount and subscribe before the first toast.
    await nextFrame();
    await nextFrame();
    return toaster;
  });
  const ready = toasterReady;
  queue = queue.then(() => ready.then(task)).catch(() => undefined);
}

let counter = 0;
const newId = () => `notify-${++counter}`;

function show(tone: Tone, title: string, description?: string, options?: ToastOptions) {
  run((toaster) => toaster.notify[tone](title, description, options));
}

function resolveMessage<T>(message: Message<T>, value: T) {
  const resolved = typeof message === "function" ? message(value) : message;
  return typeof resolved === "string" ? { title: resolved, description: undefined } : resolved;
}

export const notify = {
  success: (title: string, description?: string, options?: NotifyOptions) => void show("success", title, description, options),
  error: (title: string, description?: string, options?: NotifyOptions) => void show("error", title, description, options),
  info: (title: string, description?: string, options?: NotifyOptions) => void show("info", title, description, options),
  /** Shows a spinner toast that stays until dismissed or replaced; returns its id. */
  loading: (title: string, description?: string): string => {
    const id = newId();
    show("loading", title, description, { id });
    return id;
  },
  /** Closes one toast, or all of them when called without an id. */
  dismiss: (id?: string) => {
    if (requested) run((toaster) => toaster.notify.dismiss(id));
  },
  /**
   * Loading toast that turns into success or error when `promise` settles.
   * Returns the original promise, so callers can still await it.
   */
  promise: <T>(promise: Promise<T>, messages: { loading: string; success: Message<T>; error: Message<unknown> }): Promise<T> => {
    const id = notify.loading(messages.loading);
    promise.then(
      (value) => {
        const { title, description } = resolveMessage(messages.success, value);
        show("success", title, description, { id });
      },
      (error: unknown) => {
        const { title, description } = resolveMessage(messages.error, error);
        show("error", title, description, { id });
      },
    );
    return promise;
  },
};
