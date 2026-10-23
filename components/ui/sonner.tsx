"use client";

import { useEffect, useRef } from "react";
import { Toaster as Sonner, toast as sonnerToast, type ToasterProps } from "sonner";
import { Cancel01Icon, InformationCircleIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/icon";
import { Lottie } from "@/components/ui/lottie";
import { animate, ease, prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

const DURATION = 4500;
/** Toasts with an action button stay a little longer so there's time to click it. */
const ACTION_DURATION = 7000;

export type Tone = "success" | "error" | "info" | "loading";

export type ToastAction = { label: string; onClick: () => void };

export type ToastOptions = {
  /** Reusing an id replaces that toast (e.g. a loading toast turning into success). */
  id?: string | number;
  /** A button inside the toast, e.g. `{ label: "Urungkan", onClick: undo }`. */
  action?: ToastAction;
  duration?: number;
};

const tones: Record<Tone, { strip: string; bar: string; badge: string }> = {
  success: { strip: "bg-turquoise", bar: "bg-turquoise", badge: "bg-turquoise/15" },
  error: { strip: "bg-coral", bar: "bg-coral", badge: "bg-coral/15" },
  info: { strip: "bg-sun", bar: "bg-sun", badge: "bg-sun/30" },
  loading: { strip: "bg-turquoise", bar: "bg-turquoise", badge: "bg-turquoise/15" },
};

function ToastBadge({ tone }: { tone: Tone }) {
  if (tone === "info") return <Icon icon={InformationCircleIcon} className="size-5" />;
  if (tone === "loading") return <Lottie name="loader" className="size-8" />;
  return <Lottie name={tone === "success" ? "upload-success" : "error"} loop={false} className="size-10" />;
}

function ToastCard({
  id,
  tone,
  title,
  description,
  action,
  duration,
}: {
  id: string | number;
  tone: Tone;
  title: string;
  description?: string;
  action?: ToastAction;
  duration: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const style = tones[tone];
  const timed = Number.isFinite(duration);

  useEffect(() => {
    const node = ref.current;
    if (!node || prefersReducedMotion()) return;
    const animations = [
      ...animate(node.querySelector("[data-toast-body]"), [{ opacity: 0, translate: "18px 0" }, { opacity: 1, translate: "0 0" }], { duration: 0.35, ease: ease.outStrong }),
      ...(timed ? animate(node.querySelector("[data-toast-bar]"), [{ scale: "1 1" }, { scale: "0 1" }], { duration: duration / 1000, ease: ease.linear, persist: true }) : []),
    ];
    return () => animations.forEach((animation) => animation.cancel());
  }, [timed, duration]);

  return (
    <div
      ref={ref}
      role={tone === "loading" ? "status" : undefined}
      className="relative flex w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-xl bg-white text-teal shadow-[0_18px_40px_-16px_rgba(26,83,92,0.5)] ring-1 ring-teal/10"
    >
      <span className={cn("w-1.5 shrink-0", style.strip)} />
      <div data-toast-body className="flex min-w-0 flex-1 items-start gap-3 p-3 pr-9">
        <div className={cn("grid size-10 shrink-0 place-items-center rounded-full", style.badge)}>
          <ToastBadge tone={tone} />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-bold leading-5">{title}</p>
          {description ? <p className="mt-0.5 text-xs leading-4 text-muted-foreground">{description}</p> : null}
          {action ? (
            <button
              type="button"
              onClick={() => {
                action.onClick();
                sonnerToast.dismiss(id);
              }}
              className="mt-2 inline-flex h-7 items-center rounded-md bg-teal px-2.5 text-xs font-semibold text-mint transition-colors hover:bg-teal/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turquoise"
            >
              {action.label}
            </button>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        aria-label="Tutup notifikasi"
        onClick={() => sonnerToast.dismiss(id)}
        className="absolute right-2 top-2 grid size-6 place-items-center rounded-md text-teal/90 transition-colors hover:bg-teal/8 hover:text-teal"
      >
        <Icon icon={Cancel01Icon} className="size-3.5" />
      </button>
      {timed ? (
        <span data-toast-bar className={cn("absolute bottom-0 left-1.5 right-0 h-0.5 opacity-70", style.bar)} />
      ) : (
        <span aria-hidden className="absolute bottom-0 left-1.5 right-0 h-0.5 animate-pulse bg-turquoise/70" />
      )}
    </div>
  );
}

function show(tone: Tone, title: string, description?: string, options: ToastOptions = {}) {
  const duration = options.duration ?? (tone === "loading" ? Infinity : options.action ? ACTION_DURATION : DURATION);
  return sonnerToast.custom(
    // Keyed by tone so a loading toast that turns into success/error remounts and replays its entrance.
    (id) => <ToastCard key={tone} id={id} tone={tone} title={title} description={description} action={options.action} duration={duration} />,
    { id: options.id, duration },
  );
}

/** App-wide toast API with palette-styled cards. Prefer the lazy wrapper in notify.ts. */
export const notify = {
  success: (title: string, description?: string, options?: ToastOptions) => show("success", title, description, options),
  error: (title: string, description?: string, options?: ToastOptions) => show("error", title, description, options),
  info: (title: string, description?: string, options?: ToastOptions) => show("info", title, description, options),
  loading: (title: string, description?: string, options?: ToastOptions) => show("loading", title, description, options),
  dismiss: (id?: string | number) => sonnerToast.dismiss(id),
};

export function Toaster(props: ToasterProps) {
  return <Sonner position="bottom-right" gap={10} offset={20} visibleToasts={4} {...props} />;
}
