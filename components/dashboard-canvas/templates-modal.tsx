"use client";

import { useCallback } from "react";
import { ChartThumb } from "@/components/dashboard-canvas/chart-thumbs";
import { ChartTypeIllustration } from "@/components/illustrations";
import { Modal } from "@/components/ui/modal";
import { templatesFor, type WidgetTemplate } from "@/lib/chart-builder/templates";
import type { SourceDef, SourceId } from "@/lib/chart-builder/types";
import { withMotion } from "@/lib/gsap";
import { cn } from "@/lib/utils";

/** "Mulai dari template": a bento grid (after Aceternity's Bento Grid) of ready-made widgets. */
export default function TemplatesModal({
  sourceIds,
  sourceDefs,
  onPick,
  onClose,
}: {
  sourceIds: SourceId[];
  sourceDefs: Partial<Record<SourceId, SourceDef>>;
  onPick: (template: WidgetTemplate) => void;
  onClose: () => void;
}) {
  const templates = templatesFor(sourceIds);
  const reveal = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    withMotion((gsap) => gsap.from(node.children, { opacity: 0, y: 14, duration: 0.4, stagger: 0.04, ease: "power2.out", delay: 0.15, clearProps: "opacity,transform" }));
  }, []);

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      art={<ChartTypeIllustration className="h-20" />}
      title="Mulai dari template"
      description="Pilih contoh, lalu sesuaikan di editor sebelum ditambahkan."
      className="sm:max-w-3xl"
    >
      <div ref={reveal} className="grid max-h-[60vh] auto-rows-[minmax(120px,auto)] gap-2 overflow-y-auto p-1 text-left sm:grid-cols-3">
        {templates.map((template, index) => (
          <button
            key={`${template.source}-${template.title}`}
            type="button"
            onClick={() => onPick(template)}
            className={cn(
              "group grid content-between gap-2 rounded-xl border border-border bg-card p-3 text-left transition-[border-color,box-shadow,translate] hover:-translate-y-0.5 hover:border-turquoise hover:shadow-[var(--soft-shadow)]",
              index % 5 === 0 && "sm:col-span-2",
            )}
          >
            <span className="grid h-14 place-items-center rounded-lg bg-[linear-gradient(135deg,rgba(78,205,196,0.16),rgba(255,230,109,0.22))]">
              <ChartThumb kind={template.chart} className="h-10 w-16 transition-transform duration-300 group-hover:scale-110" />
            </span>
            <span>
              <span className="block text-xs font-bold text-teal">{template.title}</span>
              <span className="block text-[11px] text-muted-foreground">{template.description}</span>
              <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-teal/80">{sourceDefs[template.source]?.label}</span>
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
