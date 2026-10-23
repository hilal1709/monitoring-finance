"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCustomize } from "@/components/dashboard-canvas/customize-context";
import { useCanvasContent, type CanvasState } from "@/components/dashboard-canvas/canvas-content";
import { CanvasDock } from "@/components/dashboard-canvas/dock";
import EditChrome from "@/components/dashboard-canvas/edit-chrome";
import { GRID_GAP, ROW_HEIGHT, bottomOf, mergeLayout, newId, type BuiltinWidget } from "@/components/dashboard-canvas/layout-utils";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { notify } from "@/components/ui/notify";
import type { FilterConfig, LayoutItem, PageLayout, SourceDef, SourceId, WidgetSpec } from "@/lib/chart-builder/types";
import { isBuiltin } from "@/lib/chart-builder/types";
import { sanitizeLayout } from "@/lib/chart-builder/validate";

// Everything edit mode needs — draft, undo/redo, saving, the dock, the editors,
// the guide and the tour. One lazy chunk, loaded when "Atur Dashboard" is pressed.

const EditGrid = dynamic(() => import("@/components/dashboard-canvas/edit-grid"), {
  ssr: false,
  loading: () => <div className="h-96 rounded-lg shimmer" aria-hidden />,
});
const WidgetEditor = dynamic(() => import("@/components/dashboard-canvas/widget-editor"), { ssr: false });
const FilterEditor = dynamic(() => import("@/components/dashboard-canvas/filter-editor"), { ssr: false });
const TemplatesModal = dynamic(() => import("@/components/dashboard-canvas/templates-modal"), { ssr: false });
const GuideModal = dynamic(() => import("@/components/dashboard-canvas/guide-modal"), { ssr: false });
const VersionsModal = dynamic(() => import("@/components/dashboard-canvas/versions-modal"), { ssr: false });
const CanvasTour = dynamic(() => import("@/components/dashboard-canvas/tour"), { ssr: false });

const TOUR_KEY = "dashboard-canvas-tour-v1";
const draftKey = (view: string) => `dashboard-canvas-draft:${view}`;

function readStorage(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Private mode / blocked storage: drafts simply aren't kept.
  }
}

type EditorTarget = { id: string; spec: WidgetSpec; isNew: boolean } | null;
/** `replaces`: a built-in page filter being turned into a canvas filter in its place. */
type FilterTarget = { config: FilterConfig | null; replaces?: string } | null;

/** The starting draft: the saved layout grown to fit what was rendered, or a kept draft. */
function initialDraft(view: string, merged: PageLayout, builtins: BuiltinWidget[], measured: Map<string, number>) {
  const needed = (item: LayoutItem) => {
    const height = measured.get(item.i);
    return Math.max(item.h, height ? Math.ceil((height + GRID_GAP) / (ROW_HEIGHT + GRID_GAP)) : item.h);
  };
  // Widgets that start on the same row and had the same height grow together, so
  // the edit grid's compaction doesn't slide later rows into the gaps.
  const rowHeight = new Map<string, number>();
  for (const item of merged.items) {
    const key = `${item.y}:${item.h}`;
    rowHeight.set(key, Math.max(rowHeight.get(key) ?? 0, needed(item)));
  }
  const grown: PageLayout = { ...merged, items: merged.items.map((item) => ({ ...item, h: rowHeight.get(`${item.y}:${item.h}`) ?? item.h })) };
  const stored = readStorage(draftKey(view));
  if (stored) {
    try {
      // Same checks (and 12 → 24 column upgrade) as layouts read from the server.
      const parsed = sanitizeLayout(JSON.parse(stored), view);
      if (parsed && (JSON.parse(stored) as { view?: string }).view === view) return { draft: mergeLayout(parsed, view, builtins), restoredFrom: grown };
    } catch {
      writeStorage(draftKey(view), null);
    }
  }
  return { draft: grown, restoredFrom: null };
}

export default function CanvasEditor({
  view,
  merged,
  builtins,
  primarySource,
  measured,
  state,
}: {
  view: string;
  merged: PageLayout;
  builtins: BuiltinWidget[];
  primarySource: SourceId;
  /** Rendered widget heights from view mode, so nothing starts clipped. */
  measured: Map<string, number>;
  state: CanvasState;
}) {
  const customize = useCustomize();
  const confirm = useConfirm();
  const { builtinById } = state;

  // Mounted fresh every time edit mode opens, so the start state is read once here.
  const [start] = useState(() => initialDraft(view, merged, builtins, measured));
  const [draft, setDraft] = useState<PageLayout>(start.draft);
  const [history, setHistory] = useState<{ past: PageLayout[]; future: PageLayout[] }>(() => ({ past: start.restoredFrom ? [start.restoredFrom] : [], future: [] }));
  const [editorTarget, setEditorTarget] = useState<EditorTarget>(null);
  const [filterTarget, setFilterTarget] = useState<FilterTarget>(null);
  const [modal, setModal] = useState<"templates" | "guide" | "versions" | null>(null);
  const [tour, setTour] = useState(() => !readStorage(TOUR_KEY));
  const [saving, setSaving] = useState(false);
  const content = useCanvasContent(draft, state, { editing: true });

  useEffect(() => {
    if (start.restoredFrom) notify.info("Draft dipulihkan", "Perubahan yang belum disimpan sebelumnya dimuat lagi.");
  }, [start]);

  // Toasts move above the dock while editing (see globals.css).
  useEffect(() => {
    document.body.dataset.canvasEditing = "";
    return () => {
      delete document.body.dataset.canvasEditing;
    };
  }, []);

  useEffect(() => {
    if (history.past.length) writeStorage(draftKey(view), JSON.stringify(draft));
  }, [draft, history.past.length, view]);

  const commit = useCallback((next: PageLayout | ((current: PageLayout) => PageLayout)) => {
    setDraft((current) => {
      const value = typeof next === "function" ? next(current) : next;
      setHistory((stack) => ({ past: [...stack.past.slice(-49), current], future: [] }));
      return value;
    });
  }, []);

  const undo = () => {
    const previous = history.past.at(-1);
    if (!previous) return;
    setHistory({ past: history.past.slice(0, -1), future: [draft, ...history.future] });
    setDraft(previous);
  };
  const redo = () => {
    const [next, ...rest] = history.future;
    if (!next) return;
    setHistory({ past: [...history.past, draft], future: rest });
    setDraft(next);
  };

  // ---- widget actions --------------------------------------------------------------
  const specFor = (id: string): WidgetSpec | null => {
    const widget = draft.widgets[id];
    if (widget && !isBuiltin(widget)) return widget;
    const builtin = builtinById.get(widget && isBuiltin(widget) ? widget.builtin : id);
    return builtin?.spec ? { ...builtin.spec, id } : null;
  };

  const openEditor = (id: string) => {
    const spec = specFor(id);
    if (spec) setEditorTarget({ id, spec, isNew: false });
  };

  const addWidget = (chart: WidgetSpec["chart"] = "bar", template?: Omit<WidgetSpec, "id">) => {
    const id = newId("w");
    const blank: WidgetSpec = template
      ? { ...template, id }
      : { id, title: chart === "card" ? "Kartu baru" : "Grafik baru", source: primarySource, chart, measures: [], filters: [], comparison: chart === "card" ? "page" : undefined };
    setEditorTarget({ id, spec: blank, isNew: true });
  };

  const applySpec = (spec: WidgetSpec, isNew: boolean) => {
    commit((current) => {
      const widgets = { ...current.widgets, [spec.id]: spec };
      if (!isNew) return { ...current, widgets };
      const card = spec.chart === "card";
      const item: LayoutItem = { i: spec.id, x: 0, y: bottomOf(current.items), w: card ? 6 : 12, h: card ? 3 : 8 };
      return { ...current, widgets, items: [...current.items, item] };
    });
    setEditorTarget(null);
    notify.success(isNew ? "Widget ditambahkan" : "Widget diperbarui", isNew ? "Geser atau ubah ukurannya sesuai kebutuhan." : undefined);
  };

  const duplicate = (id: string) => {
    const spec = specFor(id);
    const source = draft.items.find((item) => item.i === id);
    if (!spec || !source) return;
    const copy: WidgetSpec = { ...spec, id: newId("w"), title: `${spec.title} (salinan)` };
    commit((current) => ({
      ...current,
      widgets: { ...current.widgets, [copy.id]: copy },
      items: [...current.items, { ...source, i: copy.id, y: bottomOf(current.items), hidden: false }],
    }));
  };

  const remove = (id: string) => {
    const widget = draft.widgets[id];
    const isFilter = draft.filters.some((filter) => filter.id === id);
    const builtinBacked = builtinById.has(id) || Boolean(widget && isBuiltin(widget));
    const before = draft;
    commit((current) => {
      if (isFilter) return { ...current, filters: current.filters.filter((filter) => filter.id !== id), items: current.items.filter((item) => item.i !== id) };
      if (builtinBacked) return { ...current, items: current.items.map((item) => (item.i === id ? { ...item, hidden: true } : item)) };
      const widgets = { ...current.widgets };
      delete widgets[id];
      return { ...current, widgets, items: current.items.filter((item) => item.i !== id) };
    });
    notify.info(builtinBacked ? "Widget disembunyikan" : "Widget dihapus", builtinBacked ? "Bisa dimunculkan lagi dari menu Tersembunyi." : undefined, {
      action: { label: "Urungkan", onClick: () => commit(before) },
    });
  };

  const restoreHidden = (id: string) => commit((current) => ({ ...current, items: current.items.map((item) => (item.i === id ? { ...item, hidden: false, y: bottomOf(current.items) } : item)) }));

  /** Built-in turned custom → back to the shipped version. */
  const revertToBuiltin = (id: string) => commit((current) => ({ ...current, widgets: { ...current.widgets, [id]: { builtin: id } } }));

  const applyFilter = (config: FilterConfig) => {
    const replaces = filterTarget?.replaces;
    if (replaces) {
      const builtin = builtinById.get(replaces);
      commit((current) => {
        const old = current.items.find((item) => item.i === replaces);
        const place = old ? { x: old.x, y: old.y, w: old.w, h: old.h } : { x: 0, y: bottomOf(current.items), w: 4, h: 1 };
        return {
          ...current,
          filters: [...current.filters, config],
          items: [...current.items.map((item) => (item.i === replaces ? { ...item, hidden: true } : item)), { i: config.id, ...place }],
        };
      });
      // The old filter would otherwise keep narrowing the data underneath.
      builtin?.filter?.clear();
      setFilterTarget(null);
      notify.success("Filter diganti", "Filter bawaan disembunyikan; bisa dimunculkan lagi dari menu Tersembunyi.");
      return;
    }
    commit((current) => {
      const exists = current.filters.some((filter) => filter.id === config.id);
      const filters = exists ? current.filters.map((filter) => (filter.id === config.id ? config : filter)) : [...current.filters, config];
      const items = exists ? current.items : [...current.items, { i: config.id, x: 0, y: bottomOf(current.items), w: config.control === "period-range" ? 8 : 6, h: 2 }];
      return { ...current, filters, items };
    });
    setFilterTarget(null);
  };

  // ---- save / cancel / reset -------------------------------------------------------
  const leave = (layout?: PageLayout | null) => {
    if (layout !== undefined) customize?.setLayout(layout);
    writeStorage(draftKey(view), null);
    customize?.setEditing(false);
  };

  async function save() {
    setSaving(true);
    try {
      const response = await fetch(`/api/layouts/${view}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ layout: draft }) });
      const payload = (await response.json()) as { layout?: PageLayout; error?: string };
      if (!response.ok || !payload.layout) throw new Error(payload.error ?? "Layout tidak dapat disimpan.");
      leave(payload.layout);
      notify.success("Dashboard disimpan", "Semua orang yang membuka halaman ini melihat susunan baru.");
    } catch (error) {
      notify.error("Gagal menyimpan", error instanceof Error ? error.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  async function cancel() {
    if (history.past.length && !(await confirm({ title: "Buang perubahan?", description: "Perubahan yang belum disimpan akan hilang.", confirmLabel: "Buang", tone: "danger" }))) return;
    leave();
  }

  async function reset() {
    if (!(await confirm({ title: "Kembalikan ke tampilan awal?", description: "Semua grafik, card, dan filter custom di halaman ini dihapus. Versi lama tetap ada di Riwayat.", confirmLabel: "Kembalikan", tone: "danger" }))) return;
    try {
      const response = await fetch(`/api/layouts/${view}`, { method: "DELETE" });
      if (!response.ok) throw new Error(((await response.json()) as { error?: string }).error);
      leave(null);
      notify.success("Tampilan awal dipulihkan");
    } catch (error) {
      notify.error("Gagal mengembalikan", error instanceof Error ? error.message : undefined);
    }
  }

  // ---- rendering -------------------------------------------------------------------
  const sourceDefs = useMemo(() => Object.fromEntries(Object.entries(content.sources).map(([id, source]) => [id, source?.def])) as Partial<Record<SourceId, SourceDef>>, [content.sources]);
  const minSizes = useMemo(
    () => Object.fromEntries(draft.items.map((item) => [item.i, draft.filters.some((filter) => filter.id === item.i) ? { minW: 4, minH: 1 } : { minW: 4, minH: 2 }])),
    [draft.items, draft.filters],
  );
  const hiddenItems = draft.items.filter((item) => item.hidden).map((item) => ({ id: item.i, title: content.titleOf(item.i) }));

  function renderEditItem(id: string) {
    const isFilter = draft.filters.some((filter) => filter.id === id);
    const widget = draft.widgets[id];
    const builtinBacked = builtinById.has(id) && !isFilter;
    const builtinFilter = builtinBacked ? builtinById.get(id)?.filter : undefined;
    const editFilter = () => {
      if (builtinFilter) {
        setFilterTarget({ config: { id: newId("f"), field: builtinFilter.field, label: builtinFilter.label, control: "multi" }, replaces: id });
        return;
      }
      setFilterTarget({ config: draft.filters.find((filter) => filter.id === id) ?? null });
    };
    return (
      <EditChrome
        title={content.titleOf(id)}
        isFilter={isFilter || Boolean(builtinFilter)}
        canEdit={isFilter || Boolean(builtinFilter) || Boolean(specFor(id))}
        canDuplicate={!isFilter && Boolean(specFor(id))}
        canRevert={Boolean(builtinBacked && widget && !isBuiltin(widget))}
        hides={builtinBacked}
        onEdit={() => (isFilter || builtinFilter ? editFilter() : openEditor(id))}
        onDuplicate={() => duplicate(id)}
        onRevert={() => revertToBuiltin(id)}
        onRemove={() => remove(id)}
      >
        {content.renderContent(id)}
      </EditChrome>
    );
  }

  return (
    <>
      <EditGrid items={draft.items} minSizes={minSizes} renderItem={renderEditItem} onChange={(items) => commit((current) => ({ ...current, items }))} />

      <CanvasDock
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        dirty={history.past.length > 0}
        saving={saving}
        crossFilter={Boolean(draft.crossFilter)}
        hidden={hiddenItems}
        onAddChart={() => addWidget("bar")}
        onAddCard={() => addWidget("card")}
        onAddFilter={() => setFilterTarget({ config: null })}
        onTemplates={() => setModal("templates")}
        onUndo={undo}
        onRedo={redo}
        onToggleCrossFilter={() => commit((current) => ({ ...current, crossFilter: !current.crossFilter }))}
        onRestoreHidden={restoreHidden}
        onGuide={() => setModal("guide")}
        onTour={() => setTour(true)}
        onVersions={() => setModal("versions")}
        onReset={() => void reset()}
        onCancel={() => void cancel()}
        onSave={() => void save()}
      />

      {editorTarget ? (
        <WidgetEditor
          spec={editorTarget.spec}
          isNew={editorTarget.isNew}
          sources={content.sources}
          onDatasetAdded={content.addDatasetSource}
          context={content.baseContext}
          contextFor={(spec) => content.contextFor(editorTarget.id, spec)}
          onApply={(spec) => applySpec(spec, editorTarget.isNew)}
          onClose={() => setEditorTarget(null)}
        />
      ) : null}
      {filterTarget ? (
        <FilterEditor
          config={filterTarget.config}
          sourceDefs={sourceDefs}
          widgets={draft.items.filter((item) => !draft.filters.some((filter) => filter.id === item.i)).map((item) => ({ id: item.i, title: content.titleOf(item.i) }))}
          onApply={applyFilter}
          onClose={() => setFilterTarget(null)}
        />
      ) : null}
      {modal === "templates" ? (
        <TemplatesModal
          sourceIds={Object.keys(content.sources) as SourceId[]}
          sourceDefs={sourceDefs}
          onPick={(template) => {
            setModal(null);
            addWidget(template.chart, template);
          }}
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal === "guide" ? <GuideModal onClose={() => setModal(null)} /> : null}
      {modal === "versions" ? (
        <VersionsModal
          view={view}
          onRestored={(restored) => {
            setModal(null);
            leave(restored);
          }}
          onClose={() => setModal(null)}
        />
      ) : null}
      {tour ? (
        <CanvasTour
          onDone={() => {
            writeStorage(TOUR_KEY, "done");
            setTour(false);
          }}
        />
      ) : null}
    </>
  );
}
