"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/icon";
import { loadGsap, withGsap } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/motion";
import { useIsomorphicLayoutEffect } from "@/lib/use-reveal-animation";
import { cn } from "@/lib/utils";
import { navigationGroups } from "@/lib/dashboard-constants";
import type { DashboardView } from "@/lib/dashboard-types";

type GroupId = (typeof navigationGroups)[number]["id"];

// The sidebar remounts on every client navigation. Module state lets the intro
// play once per session and lets the active pill glide from where it last was.
let navIntroPlayed = false;
let lastPill: { y: number; height: number } | null = null;

export function SidebarNavigation({
  view,
  onNavigate,
}: {
  view: DashboardView;
  onNavigate?: () => void;
}) {
  const [openGroups, setOpenGroups] = useState<Record<GroupId, boolean>>({
    export: true,
    "non-export": true,
    kpi: true,
  });
  const navRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);

  // Intro: items are hidden before paint, then slide in once GSAP arrives.
  useIsomorphicLayoutEffect(() => {
    if (navIntroPlayed || prefersReducedMotion()) return;
    const items = Array.from(navRef.current?.querySelectorAll<HTMLElement>("[data-nav-item]") ?? []);
    if (!items.length) return;
    navIntroPlayed = true;
    for (const item of items) Object.assign(item.style, { opacity: "0", transform: "translateX(-14px)" });
    loadGsap()
      .then((gsap) => gsap.to(items, { opacity: 1, x: 0, duration: 0.4, stagger: 0.04, ease: "power2.out", clearProps: "opacity,transform" }))
      .catch(() => {
        for (const item of items) Object.assign(item.style, { opacity: "", transform: "" });
      });
  }, []);

  // Active pill: measure the active link and glide there from the previous spot.
  function placePill() {
    const nav = navRef.current;
    const pill = pillRef.current;
    if (!nav || !pill) return;
    const active = nav.querySelector<HTMLElement>('[data-active-link="true"]');
    if (!active || active.closest('[data-nav-panel][aria-hidden="true"]')) {
      withGsap((gsap) => gsap.to(pill, { opacity: 0, duration: 0.2, overwrite: "auto" }));
      return;
    }
    // offset* is relative to the (positioned) nav and ignores the intro's transforms.
    const target = { y: active.offsetTop, height: active.offsetHeight };
    Object.assign(pill.style, { left: `${active.offsetLeft}px`, width: `${active.offsetWidth}px` });
    const from = lastPill;
    lastPill = target;
    if (from && !prefersReducedMotion()) {
      withGsap((gsap) => {
        gsap.fromTo(pill, { y: from.y, height: from.height }, { y: target.y, height: target.height, duration: 0.5, ease: "back.out(1.4)", overwrite: "auto" });
        gsap.to(pill, { opacity: 1, duration: 0.2, overwrite: "auto" });
      });
    } else {
      Object.assign(pill.style, { transform: `translateY(${target.y}px)`, height: `${target.height}px`, opacity: "1" });
    }
  }

  useIsomorphicLayoutEffect(placePill, [view]);

  function toggleGroup(id: GroupId, panel: HTMLElement | null) {
    const willOpen = !openGroups[id];
    setOpenGroups((current) => ({ ...current, [id]: willOpen }));
    if (!panel || prefersReducedMotion()) {
      requestAnimationFrame(placePill);
      return;
    }
    withGsap((gsap) => {
      if (willOpen) {
        gsap.fromTo(panel, { height: 0, opacity: 0 }, { height: "auto", opacity: 1, duration: 0.35, ease: "power2.out", overwrite: "auto", clearProps: "height,opacity", onComplete: placePill });
        gsap.from(panel.firstElementChild?.children ?? [], { opacity: 0, x: -8, duration: 0.3, stagger: 0.04, delay: 0.08, clearProps: "opacity,transform" });
      } else {
        gsap.fromTo(panel, { height: panel.scrollHeight, opacity: 1 }, { height: 0, opacity: 0, duration: 0.28, ease: "power2.in", overwrite: "auto", clearProps: "height,opacity", onComplete: placePill });
      }
    });
  }

  return (
    <nav ref={navRef} className="relative flex flex-col gap-3 text-sm">
      <span
        ref={pillRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 z-0 rounded-md bg-turquoise opacity-0 shadow-[0_6px_16px_-6px_rgba(78,205,196,0.9)] before:absolute before:left-0 before:top-1/2 before:h-4 before:w-1 before:-translate-y-1/2 before:rounded-r-full before:bg-sun"
      />
      {navigationGroups.map((group) => {
        const expanded = openGroups[group.id];
        const groupActive = group.items.some((item) => item.view === view);

        return (
          <div key={group.id}>
            <button
              data-nav-item
              aria-expanded={expanded}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left font-semibold transition-colors",
                groupActive ? "border-mint/15 bg-mint/10 text-mint" : "border-transparent text-mint/85 hover:bg-mint/10 hover:text-mint",
              )}
              type="button"
              onClick={(event) => {
                const wrapper = event.currentTarget.parentElement;
                toggleGroup(group.id, wrapper?.querySelector<HTMLElement>("[data-nav-panel]") ?? null);
              }}
            >
              <Icon icon={group.icon} className="size-4.5" />
              <span className="min-w-0 flex-1 truncate">{group.label}</span>
              <span className={cn("inline-flex transition-transform duration-300", !expanded && "-rotate-90")}>
                <Icon icon={ArrowDown01Icon} className="size-4" />
              </span>
            </button>

            <div data-nav-panel className={cn("overflow-hidden", !expanded && "h-0 opacity-0")} aria-hidden={!expanded}>
              <div className="ml-4 mt-1.5 flex flex-col gap-1 border-l border-mint/20 pl-3">
                {group.items.map((item) => {
                  const active = item.view === view;

                  return (
                    <Link
                      key={item.view}
                      data-nav-item
                      data-active-link={active}
                      href={item.href}
                      onClick={onNavigate}
                      tabIndex={expanded ? undefined : -1}
                      className={cn(
                        "group relative z-10 flex min-h-9 items-center gap-2.5 rounded-md px-3 py-2 text-[13px] leading-4 transition-colors",
                        active ? "font-semibold text-teal" : "text-mint/75 hover:bg-mint/10 hover:text-mint",
                      )}
                    >
                      <span className="inline-flex transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6">
                        <Icon icon={item.icon} className="size-4" />
                      </span>
                      <span className="transition-transform duration-200 group-hover:translate-x-0.5">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
