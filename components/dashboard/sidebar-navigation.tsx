"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/icon";
import { animate, autoHeight, ease, prefersReducedMotion } from "@/lib/motion";
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

  // Intro: items slide in once per session.
  useIsomorphicLayoutEffect(() => {
    if (navIntroPlayed || prefersReducedMotion()) return;
    const items = navRef.current?.querySelectorAll<HTMLElement>("[data-nav-item]");
    if (!items?.length) return;
    navIntroPlayed = true;
    animate(items, [{ opacity: 0, translate: "-14px 0" }, { opacity: 1, translate: "0 0" }], { duration: 0.4, stagger: 0.04, ease: ease.out });
  }, []);

  // Active pill: measure the active link and glide there from the previous spot.
  function placePill() {
    const nav = navRef.current;
    const pill = pillRef.current;
    if (!nav || !pill) return;
    const active = nav.querySelector<HTMLElement>('[data-active-link="true"]');
    if (!active || active.closest('[data-nav-panel][aria-hidden="true"]')) {
      animate(pill, [{ opacity: 0 }], { duration: 0.2, persist: true });
      return;
    }
    // offset* is relative to the (positioned) nav and ignores the intro's transforms.
    const target = { y: active.offsetTop, height: active.offsetHeight };
    Object.assign(pill.style, { left: `${active.offsetLeft}px`, width: `${active.offsetWidth}px` });
    const end = { translate: `0 ${target.y}px`, height: `${target.height}px`, opacity: 1 };
    if (lastPill && !prefersReducedMotion()) {
      animate(pill, [{ translate: `0 ${lastPill.y}px`, height: `${lastPill.height}px` }, end], { duration: 0.5, ease: ease.back, persist: true });
    } else {
      Object.assign(pill.style, { translate: end.translate, height: end.height, opacity: "1" });
    }
    lastPill = target;
  }

  useIsomorphicLayoutEffect(placePill, [view]);

  function toggleGroup(id: GroupId, panel: HTMLElement | null) {
    const willOpen = !openGroups[id];
    setOpenGroups((current) => ({ ...current, [id]: willOpen }));
    if (!panel || prefersReducedMotion()) {
      requestAnimationFrame(placePill);
      return;
    }
    if (willOpen) {
      animate(panel, [{ height: "0px", opacity: 0 }, { height: autoHeight(panel), opacity: 1 }], { duration: 0.35, ease: ease.out, onComplete: placePill });
      animate(panel.firstElementChild?.children, [{ opacity: 0, translate: "-8px 0" }, { opacity: 1, translate: "0 0" }], { duration: 0.3, stagger: 0.04, delay: 0.08 });
    } else {
      animate(panel, [{ height: autoHeight(panel), opacity: 1 }, { height: "0px", opacity: 0 }], { duration: 0.28, ease: ease.in, onComplete: placePill });
    }
  }

  return (
    <nav ref={navRef} className="relative flex flex-col gap-3 text-sm">
      <span ref={pillRef} aria-hidden className="pointer-events-none absolute left-0 top-0 z-0 rounded-md bg-turquoise opacity-0 shadow-[0_6px_16px_-6px_rgba(78,205,196,0.9)]" />
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
