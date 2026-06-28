"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsomorphicLayoutEffect } from "@/lib/use-reveal-animation";
import { navigationGroups } from "@/lib/dashboard-constants";
import type { DashboardView } from "@/lib/dashboard-types";

// The sidebar remounts on every client navigation; only play the intro once
// per session so switching menus doesn't re-trigger (and flicker) the nav.
let navIntroPlayed = false;

export function SidebarNavigation({
  view,
  onNavigate,
}: {
  view: DashboardView;
  onNavigate?: () => void;
}) {
  const [openGroups, setOpenGroups] = useState<Record<(typeof navigationGroups)[number]["id"], boolean>>({
    export: true,
    "non-export": true,
  });
  const navRef = useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    if (navIntroPlayed) return;
    const nav = navRef.current;
    if (!nav) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const items = nav.querySelectorAll<HTMLElement>("[data-nav-item]");
    if (items.length === 0) return;
    navIntroPlayed = true;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        items,
        { autoAlpha: 0, x: -14 },
        { autoAlpha: 1, x: 0, duration: 0.4, stagger: 0.05, ease: "power2.out", clearProps: "transform,opacity,visibility" },
      );
    }, nav);
    return () => ctx.revert();
  }, []);

  return (
    <nav ref={navRef} className="flex flex-col gap-3 text-sm">
      {navigationGroups.map((group) => {
        const GroupIcon = group.icon;
        const expanded = openGroups[group.id];
        const groupActive = group.items.some((item) => item.view === view);

        return (
          <div key={group.id}>
            <button
              data-nav-item
              aria-expanded={expanded}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left font-semibold transition-colors",
                groupActive
                  ? "border-[#ffd166]/30 bg-[#ffd166]/10 text-[#ffd166]"
                  : "border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.07] hover:text-white",
              )}
              type="button"
              onClick={() => setOpenGroups((current) => ({ ...current, [group.id]: !current[group.id] }))}
            >
              <GroupIcon className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{group.label}</span>
              <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", expanded && "rotate-180")} />
            </button>

            {expanded ? (
              <div className="ml-4 mt-1.5 flex flex-col gap-1 border-l border-white/10 pl-3">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = item.view === view;

                  return (
                    <Link
                      key={item.view}
                      data-nav-item
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "group flex min-h-9 items-center gap-2.5 rounded-md px-3 py-2 text-[13px] leading-4 transition-colors",
                        active ? "bg-[#ffd166] font-semibold text-[#211600]" : "text-slate-400 hover:bg-white/5 hover:text-white",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
