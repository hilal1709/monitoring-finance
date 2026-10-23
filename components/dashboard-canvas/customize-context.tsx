"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DashboardSquareEditIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { PageLayout } from "@/lib/chart-builder/types";
import { cn } from "@/lib/utils";

// Edit mode is toggled from the page header but drawn by the canvas inside the
// view, so the two share this context (provided by components/dashboard-page).

type CustomizeState = {
  view: string;
  editing: boolean;
  setEditing: (editing: boolean) => void;
  /** Saved layout of this view (null = built-in). */
  layout: PageLayout | null;
  setLayout: (layout: PageLayout | null) => void;
  /** A canvas is mounted on this page, so the header shows the edit button. */
  hasCanvas: boolean;
  setHasCanvas: (value: boolean) => void;
};

const CustomizeContext = createContext<CustomizeState | null>(null);

export function CustomizeProvider({ view, initialLayout, children }: { view: string; initialLayout?: PageLayout | null; children: React.ReactNode }) {
  const [editing, setEditing] = useState(false);
  const [layout, setLayout] = useState<PageLayout | null>(initialLayout ?? null);
  const [hasCanvas, setHasCanvas] = useState(false);
  const [syncedView, setSyncedView] = useState(view);

  // Client navigation reuses this provider; adopt the new page's layout.
  if (syncedView !== view) {
    setSyncedView(view);
    setLayout(initialLayout ?? null);
    setEditing(false);
  }

  const value = useMemo(() => ({ view, editing, setEditing, layout, setLayout, hasCanvas, setHasCanvas }), [view, editing, layout, hasCanvas]);
  return <CustomizeContext.Provider value={value}>{children}</CustomizeContext.Provider>;
}

export function useCustomize() {
  return useContext(CustomizeContext);
}

/** Lets the header know a canvas is on screen. */
export function useRegisterCanvas() {
  const context = useCustomize();
  const setHasCanvas = context?.setHasCanvas;
  useEffect(() => {
    if (!setHasCanvas) return;
    setHasCanvas(true);
    return () => setHasCanvas(false);
  }, [setHasCanvas]);
}

/** "Atur Dashboard" toggle in the page header. */
export function CustomizeButton({ className }: { className?: string }) {
  const context = useCustomize();
  if (!context?.hasCanvas) return null;
  return (
    <Button
      type="button"
      variant={context.editing ? "default" : "outline"}
      aria-pressed={context.editing}
      data-tour="customize-button"
      className={cn(context.editing && "ring-2 ring-sun", className)}
      onClick={() => context.setEditing(!context.editing)}
    >
      <Icon icon={DashboardSquareEditIcon} className="h-4 w-4" />
      <span className="sr-only sm:not-sr-only">{context.editing ? "Sedang mengatur" : "Atur Dashboard"}</span>
    </Button>
  );
}
