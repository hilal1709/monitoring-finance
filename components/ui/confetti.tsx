import { cn } from "@/lib/utils";

const PIECES = 14;
const COLORS = ["var(--palette-turquoise)", "var(--palette-yellow)", "var(--palette-coral)", "var(--palette-teal)"];

/** One-shot confetti burst (pure CSS, see `.confetti-piece` in globals.css). */
export function Confetti({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 grid place-items-center", className)}>
      {Array.from({ length: PIECES }, (_, index) => {
        const angle = (index / PIECES) * 360;
        const distance = 70 + (index % 3) * 18;
        return (
          <span
            key={index}
            className="confetti-piece"
            style={
              {
                background: COLORS[index % COLORS.length],
                "--confetti-x": `${Math.cos((angle * Math.PI) / 180) * distance}px`,
                "--confetti-y": `${Math.sin((angle * Math.PI) / 180) * distance}px`,
                "--confetti-r": `${(index * 47) % 360}deg`,
                animationDelay: `${(index % 4) * 0.03}s`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
