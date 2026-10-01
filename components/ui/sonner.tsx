"use client";

import { useEffect, useRef } from "react";
import { Toaster as Sonner, toast as sonnerToast, type ToasterProps } from "sonner";
import { Cancel01Icon, InformationCircleIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/icon";
import { Lottie } from "@/components/ui/lottie";
import { animate, ease, prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

const DURATION = 4500;

type Tone = "success" | "error" | "info";

const tones: Record<Tone, { strip: string; bar: string; badge: string }> = {
  success: { strip: "bg-turquoise", bar: "bg-turquoise", badge: "bg-turquoise/15" },
  error: { strip: "bg-coral", bar: "bg-coral", badge: "bg-coral/15" },
  info: { strip: "bg-sun", bar: "bg-sun", badge: "bg-sun/30" },
};

function ToastCard({ id, tone, title, description }: { id: string | number; tone: Tone; title: string; description?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const style = tones[tone];

  useEffect(() => {
    const node = ref.current;
    if (!node || prefersReducedMotion()) return;
    const animations = [
      ...animate(node.querySelector("[data-toast-body]"), [{ opacity: 0, translate: "18px 0" }, { opacity: 1, translate: "0 0" }], { duration: 0.35, ease: ease.outStrong }),
      ...animate(node.querySelector("[data-toast-bar]"), [{ scale: "1 1" }, { scale: "0 1" }], { duration: DURATION / 1000, ease: ease.linear, persist: true }),
    ];
    return () => animations.forEach((animation) => animation.cancel());
  }, []);

  return (
    <div ref={ref} className="relative flex w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-xl bg-white text-teal shadow-[0_18px_40px_-16px_rgba(26,83,92,0.5)] ring-1 ring-teal/10">
      <span className={cn("w-1.5 shrink-0", style.strip)} />
      <div data-toast-body className="flex min-w-0 flex-1 items-start gap-3 p-3 pr-9">
        <div className={cn("grid size-10 shrink-0 place-items-center rounded-full", style.badge)}>
          {tone === "info" ? (
            <Icon icon={InformationCircleIcon} className="size-5" />
          ) : (
            <Lottie name={tone === "success" ? "upload-success" : "error"} loop={false} className="size-10" />
          )}
        </div>
        <div className="min-w-0 pt-0.5">
          <p className="text-sm font-bold leading-5">{title}</p>
          {description ? <p className="mt-0.5 text-xs leading-4 text-muted-foreground">{description}</p> : null}
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
      <span data-toast-bar className={cn("absolute bottom-0 left-1.5 right-0 h-0.5 opacity-70", style.bar)} />
    </div>
  );
}

function show(tone: Tone, title: string, description?: string) {
  return sonnerToast.custom((id) => <ToastCard id={id} tone={tone} title={title} description={description} />, { duration: DURATION });
}

/** App-wide toast API with palette-styled cards. */
export const notify = {
  success: (title: string, description?: string) => show("success", title, description),
  error: (title: string, description?: string) => show("error", title, description),
  info: (title: string, description?: string) => show("info", title, description),
};

export function Toaster(props: ToasterProps) {
  return <Sonner position="bottom-right" gap={10} offset={20} visibleToasts={4} {...props} />;
}
