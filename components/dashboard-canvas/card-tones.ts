// KPI cards normally take their colour from their position (.kpi-card:nth-child
// in globals.css). On the canvas every card sits in its own grid cell, so the
// colour is passed explicitly instead.

export type CardTone = "turquoise" | "mint" | "coral" | "sun";

export const cardToneStyles: Record<CardTone, React.CSSProperties> = {
  turquoise: { background: "var(--palette-turquoise)", color: "var(--palette-teal)" },
  mint: { background: "var(--palette-mint)", color: "var(--palette-teal)", boxShadow: "inset 0 0 0 1px rgba(26, 83, 92, 0.12)" },
  coral: { background: "#cc3f3f", color: "var(--palette-mint)" },
  sun: { background: "var(--palette-yellow)", color: "var(--palette-teal)" },
};

export const toneCycle: CardTone[] = ["turquoise", "mint", "coral", "sun"];
