import { cn } from "@/lib/utils";

const TEAL = "#174D55";
const TURQ = "#4ECDC4";
const MINT = "#F7FFF7";
const CORAL = "#FF6B6B";
const SUN = "#FFE66D";

// Idle motion lives in globals.css (`.illustration`): the whole art pops in,
// `[data-float]` floats, `[data-bounce]` hops, `[data-sway]` rocks,
// `[data-twinkle]` pulses and `[data-wave]` scrolls. No JS involved.

type IllustrationProps = { className?: string };

/** Stack of spreadsheets with an upload arrow — for "no workbook uploaded yet". */
export function EmptyUploadIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 200 160" className={cn("illustration h-32 w-auto", className)} aria-hidden>
      <ellipse cx="100" cy="146" rx="62" ry="7" fill={TEAL} opacity="0.1" />
      <g data-float>
        <rect x="46" y="30" width="78" height="96" rx="10" fill={MINT} stroke={TEAL} strokeOpacity="0.25" strokeWidth="2" transform="rotate(-8 85 78)" />
        <rect x="66" y="24" width="82" height="104" rx="10" fill="#fff" stroke={TEAL} strokeOpacity="0.3" strokeWidth="2" />
        <rect x="66" y="24" width="82" height="20" rx="10" fill={TURQ} />
        <rect x="66" y="34" width="82" height="10" fill={TURQ} />
        {[56, 72, 88, 104].map((y) => (
          <g key={y}>
            <rect x="76" y={y} width="22" height="8" rx="2" fill={TEAL} opacity="0.18" />
            <rect x="104" y={y} width="34" height="8" rx="2" fill={y === 72 ? SUN : TEAL} opacity={y === 72 ? 1 : 0.12} />
          </g>
        ))}
      </g>
      <g data-bounce>
        <circle cx="150" cy="108" r="22" fill={SUN} />
        <path d="M150 119V98m-8 8 8-8 8 8" fill="none" stroke={TEAL} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <circle data-twinkle cx="40" cy="26" r="4" fill={CORAL} />
      <circle data-twinkle cx="168" cy="40" r="3" fill={TURQ} />
      <circle data-twinkle cx="30" cy="110" r="3" fill={SUN} />
    </svg>
  );
}

/** Empty chart with a magnifier — for filters that return no rows. */
export function NoDataIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 200 150" className={cn("illustration h-28 w-auto", className)} aria-hidden>
      <ellipse cx="100" cy="138" rx="58" ry="6" fill={TEAL} opacity="0.1" />
      <g data-float>
        <rect x="38" y="22" width="112" height="96" rx="12" fill="#fff" stroke={TEAL} strokeOpacity="0.2" strokeWidth="2" />
        <path d="M54 100h80M54 40v60" stroke={TEAL} strokeOpacity="0.3" strokeWidth="3" strokeLinecap="round" />
        <rect x="64" y="80" width="12" height="20" rx="3" fill={SUN} opacity="0.55" />
        <rect x="84" y="68" width="12" height="32" rx="3" fill={TURQ} opacity="0.45" />
        <rect x="104" y="88" width="12" height="12" rx="3" fill={CORAL} opacity="0.45" />
        <path d="M60 64l20-10 20 8 26-16" fill="none" stroke={TEAL} strokeOpacity="0.35" strokeWidth="3" strokeDasharray="5 6" strokeLinecap="round" />
      </g>
      <g data-sway>
        <circle cx="146" cy="84" r="20" fill={MINT} fillOpacity="0.7" stroke={TURQ} strokeWidth="6" />
        <path d="M160 99l16 16" stroke={TEAL} strokeWidth="8" strokeLinecap="round" />
        <text x="146" y="91" textAnchor="middle" fontSize="20" fontWeight="800" fill={CORAL}>?</text>
      </g>
    </svg>
  );
}

/** Cargo ship carrying palette-colored containers — the export section mascot. */
export function ShipExportIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 240 150" className={cn("illustration h-32 w-auto", className)} aria-hidden>
      <defs>
        <clipPath id="ship-sea">
          <rect x="0" y="0" width="240" height="150" rx="16" />
        </clipPath>
      </defs>
      <g clipPath="url(#ship-sea)">
        <circle cx="196" cy="34" r="16" fill={SUN} data-twinkle />
        <g data-float>
          <rect x="70" y="52" width="26" height="22" rx="3" fill={CORAL} />
          <rect x="98" y="52" width="26" height="22" rx="3" fill={TURQ} />
          <rect x="126" y="52" width="26" height="22" rx="3" fill={SUN} />
          <rect x="84" y="30" width="26" height="22" rx="3" fill={TURQ} />
          <rect x="112" y="30" width="26" height="22" rx="3" fill={CORAL} />
          <rect x="160" y="38" width="16" height="36" rx="3" fill={MINT} stroke={TEAL} strokeWidth="2" />
          <rect x="164" y="44" width="8" height="6" rx="1" fill={TURQ} />
          <path d="M44 74h160l-18 34H64z" fill={TEAL} />
          <circle cx="86" cy="90" r="3" fill={MINT} />
          <circle cx="102" cy="90" r="3" fill={MINT} />
          <circle cx="118" cy="90" r="3" fill={MINT} />
        </g>
        <g data-wave>
          <path d="M0 112q12-8 24 0t24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0V150H0z" fill={TURQ} opacity="0.55" />
          <path d="M-12 122q12-8 24 0t24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0V150H-12z" fill={TURQ} />
        </g>
      </g>
    </svg>
  );
}

/** Torn document with a coral alert badge — for failures inside modals or panels. */
export function ErrorIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 200 150" className={cn("illustration h-28 w-auto", className)} aria-hidden>
      <ellipse cx="100" cy="138" rx="50" ry="6" fill={TEAL} opacity="0.1" />
      <g data-float>
        <path d="M62 20h56l22 22v86H62z" fill="#fff" stroke={TEAL} strokeOpacity="0.3" strokeWidth="2" />
        <path d="M118 20v22h22" fill={MINT} stroke={TEAL} strokeOpacity="0.3" strokeWidth="2" />
        <path d="M62 84l14-8 12 10 14-10 12 8 12-8 14 10" fill="none" stroke={TEAL} strokeOpacity="0.25" strokeWidth="2" />
        <rect x="74" y="50" width="40" height="6" rx="3" fill={TEAL} opacity="0.15" />
        <rect x="74" y="62" width="28" height="6" rx="3" fill={SUN} />
        <rect x="74" y="98" width="48" height="6" rx="3" fill={TEAL} opacity="0.12" />
      </g>
      <g data-bounce>
        <circle cx="140" cy="100" r="20" fill={CORAL} />
        <rect x="137" y="88" width="6" height="15" rx="3" fill={MINT} />
        <circle cx="140" cy="110" r="3.5" fill={MINT} />
      </g>
      <circle data-twinkle cx="46" cy="40" r="3" fill={TURQ} />
      <circle data-twinkle cx="162" cy="36" r="4" fill={SUN} />
    </svg>
  );
}

/** Spreadsheet columns with one picked by a cursor — editor step "Pilih data". */
export function PickDataIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 200 150" className={cn("illustration h-28 w-auto", className)} aria-hidden>
      <ellipse cx="100" cy="138" rx="58" ry="6" fill={TEAL} opacity="0.1" />
      <g data-float>
        <rect x="34" y="22" width="120" height="100" rx="12" fill="#fff" stroke={TEAL} strokeOpacity="0.25" strokeWidth="2" />
        <rect x="34" y="22" width="120" height="18" rx="12" fill={MINT} />
        <rect x="34" y="32" width="120" height="8" fill={MINT} />
        <rect x="80" y="22" width="34" height="100" fill={TURQ} opacity="0.22" />
        <rect x="80" y="22" width="34" height="100" fill="none" stroke={TURQ} strokeWidth="2.5" />
        {[0, 1, 2].map((column) => (
          <rect key={column} x={44 + column * 40} y="28" width="22" height="6" rx="3" fill={TEAL} opacity={column === 1 ? 0.7 : 0.25} />
        ))}
        {[52, 68, 84, 100].map((y) => (
          <g key={y}>
            <rect x="44" y={y} width="24" height="6" rx="3" fill={TEAL} opacity="0.14" />
            <rect x="86" y={y} width="22" height="6" rx="3" fill={TEAL} opacity="0.45" />
            <rect x="124" y={y} width="20" height="6" rx="3" fill={TEAL} opacity="0.14" />
          </g>
        ))}
      </g>
      <g data-bounce>
        <path d="M118 84l26 10-11 4 8 13-6 3-8-13-8 8z" fill={SUN} stroke={TEAL} strokeWidth="2.5" strokeLinejoin="round" />
      </g>
      <circle data-twinkle cx="26" cy="36" r="3.5" fill={CORAL} />
      <circle data-twinkle cx="170" cy="30" r="4" fill={SUN} />
    </svg>
  );
}

/** Bar, line and donut cards fanned out — editor step "Pilih jenis grafik". */
export function ChartTypeIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 220 150" className={cn("illustration h-28 w-auto", className)} aria-hidden>
      <ellipse cx="110" cy="138" rx="70" ry="6" fill={TEAL} opacity="0.1" />
      <g data-sway>
        <g transform="rotate(-10 51 76)">
          <rect x="22" y="40" width="58" height="72" rx="10" fill="#fff" stroke={TEAL} strokeOpacity="0.2" strokeWidth="2" />
          <path d="M36 66l10-8 10 6 14-12" fill="none" stroke={CORAL} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="70" cy="52" r="3" fill={CORAL} />
          <rect x="34" y="92" width="34" height="5" rx="2.5" fill={TEAL} opacity="0.15" />
        </g>
      </g>
      <g data-sway>
        <g transform="rotate(10 173 76)">
          <rect x="144" y="40" width="58" height="72" rx="10" fill="#fff" stroke={TEAL} strokeOpacity="0.2" strokeWidth="2" />
          <circle cx="173" cy="68" r="15" fill="none" stroke={TURQ} strokeWidth="8" />
          <path d="M173 53a15 15 0 0 1 14 20" fill="none" stroke={SUN} strokeWidth="8" />
          <rect x="157" y="92" width="32" height="5" rx="2.5" fill={TEAL} opacity="0.15" />
        </g>
      </g>
      <g data-float>
        <rect x="80" y="24" width="62" height="86" rx="12" fill="#fff" stroke={TURQ} strokeWidth="3" />
        <rect x="92" y="70" width="9" height="26" rx="2.5" fill={TURQ} />
        <rect x="106" y="54" width="9" height="42" rx="2.5" fill={SUN} />
        <rect x="120" y="62" width="9" height="34" rx="2.5" fill={CORAL} />
        <rect x="92" y="36" width="30" height="6" rx="3" fill={TEAL} opacity="0.3" />
        <circle cx="138" cy="28" r="10" fill={TURQ} />
        <path d="M133 28l4 4 6-7" fill="none" stroke={TEAL} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <circle data-twinkle cx="104" cy="14" r="3" fill={SUN} />
      <circle data-twinkle cx="20" cy="30" r="3.5" fill={TURQ} />
    </svg>
  );
}

/** Dotted grid with a dashed placeholder tile and a plus — for an empty custom canvas. */
export function EmptyCanvasIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 200 150" className={cn("illustration h-32 w-auto", className)} aria-hidden>
      <ellipse cx="100" cy="140" rx="64" ry="6" fill={TEAL} opacity="0.1" />
      <g data-float>
        <rect x="26" y="18" width="148" height="110" rx="14" fill={MINT} stroke={TEAL} strokeOpacity="0.2" strokeWidth="2" />
        {[0, 1, 2, 3, 4, 5].map((column) =>
          [0, 1, 2, 3].map((row) => <circle key={`${column}-${row}`} cx={44 + column * 22} cy={36 + row * 24} r="1.8" fill={TEAL} opacity="0.2" />),
        )}
        <rect x="40" y="30" width="54" height="40" rx="8" fill="#fff" stroke={TEAL} strokeOpacity="0.18" strokeWidth="2" />
        <rect x="48" y="40" width="26" height="5" rx="2.5" fill={TEAL} opacity="0.2" />
        <rect x="48" y="52" width="36" height="8" rx="3" fill={SUN} />
        <rect x="104" y="30" width="56" height="84" rx="10" fill="none" stroke={TURQ} strokeWidth="2.5" strokeDasharray="7 6" />
      </g>
      <g data-bounce>
        <circle cx="132" cy="72" r="16" fill={TURQ} />
        <path d="M132 64v16M124 72h16" stroke={TEAL} strokeWidth="3.5" strokeLinecap="round" />
      </g>
      <circle data-twinkle cx="22" cy="120" r="3" fill={CORAL} />
      <circle data-twinkle cx="182" cy="24" r="4" fill={SUN} />
    </svg>
  );
}

/** Excel file flying into a database cylinder — for uploading a custom dataset. */
export function UploadDatasetIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 200 150" className={cn("illustration h-32 w-auto", className)} aria-hidden>
      <ellipse cx="134" cy="140" rx="48" ry="6" fill={TEAL} opacity="0.1" />
      <g data-float>
        <path d="M96 86v34c0 7 18 12 38 12s38-5 38-12V86" fill="#fff" stroke={TEAL} strokeOpacity="0.3" strokeWidth="2" />
        <path d="M96 103c0 7 18 12 38 12s38-5 38-12" fill="none" stroke={TEAL} strokeOpacity="0.2" strokeWidth="2" />
        <ellipse cx="134" cy="86" rx="38" ry="12" fill={TURQ} />
        <ellipse cx="134" cy="86" rx="24" ry="6" fill={TEAL} opacity="0.2" />
        <circle cx="160" cy="112" r="3" fill={TURQ} />
        <circle cx="160" cy="126" r="3" fill={SUN} />
      </g>
      <g data-bounce>
        <g transform="rotate(-8 57 55)">
          <path d="M30 22h40l14 14v52H30z" fill="#fff" stroke={TEAL} strokeOpacity="0.35" strokeWidth="2" />
          <path d="M70 22v14h14" fill={MINT} stroke={TEAL} strokeOpacity="0.35" strokeWidth="2" />
          <rect x="38" y="46" width="38" height="30" rx="4" fill={TURQ} opacity="0.25" />
          <path d="M38 56h38M38 66h38M51 46v30M64 46v30" stroke={TEAL} strokeOpacity="0.3" strokeWidth="1.5" />
          <rect x="36" y="28" width="22" height="11" rx="3" fill={TEAL} />
          <text x="47" y="36.5" textAnchor="middle" fontSize="7" fontWeight="800" fill={MINT}>XLS</text>
        </g>
      </g>
      <path d="M90 56q20-6 32 14" fill="none" stroke={CORAL} strokeWidth="3" strokeLinecap="round" strokeDasharray="4 6" />
      <path d="M114 67l8 4 1-9" fill="none" stroke={CORAL} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle data-twinkle cx="176" cy="40" r="4" fill={SUN} />
      <circle data-twinkle cx="24" cy="110" r="3" fill={CORAL} />
    </svg>
  );
}

/** Pointer dragging a chart tile across the grid, with a resize corner — edit-mode tutorial. */
export function DragWidgetIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 200 150" className={cn("illustration h-32 w-auto", className)} aria-hidden>
      <ellipse cx="100" cy="140" rx="62" ry="6" fill={TEAL} opacity="0.1" />
      <rect x="22" y="18" width="156" height="112" rx="14" fill={MINT} stroke={TEAL} strokeOpacity="0.15" strokeWidth="2" />
      <rect x="34" y="30" width="58" height="40" rx="8" fill="#fff" stroke={TEAL} strokeOpacity="0.15" strokeWidth="2" />
      <rect x="42" y="40" width="22" height="5" rx="2.5" fill={TEAL} opacity="0.2" />
      <rect x="42" y="52" width="40" height="8" rx="3" fill={CORAL} opacity="0.6" />
      <rect x="34" y="78" width="58" height="40" rx="8" fill="none" stroke={TURQ} strokeWidth="2" strokeDasharray="6 5" />
      <path d="M100 98h-6M112 98h-6" stroke={TURQ} strokeWidth="3" strokeLinecap="round" />
      <g data-float>
        <rect x="104" y="44" width="64" height="62" rx="10" fill="#fff" stroke={TURQ} strokeWidth="3" />
        <rect x="114" y="80" width="9" height="16" rx="2" fill={TURQ} />
        <rect x="127" y="68" width="9" height="28" rx="2" fill={SUN} />
        <rect x="140" y="74" width="9" height="22" rx="2" fill={CORAL} />
        <rect x="114" y="54" width="28" height="5" rx="2.5" fill={TEAL} opacity="0.3" />
        <path d="M160 100l4-4M154 100l10-10" stroke={TEAL} strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" />
      </g>
      <g data-bounce>
        <path d="M130 62l30 11-13 5 9 15-7 4-9-15-10 9z" fill={SUN} stroke={TEAL} strokeWidth="2.5" strokeLinejoin="round" />
      </g>
      <circle data-twinkle cx="186" cy="30" r="3.5" fill={CORAL} />
      <circle data-twinkle cx="14" cy="120" r="3" fill={SUN} />
    </svg>
  );
}

/** Dashboard layout card with a save badge — for "Simpan tata letak". */
export function SaveLayoutIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 200 150" className={cn("illustration h-28 w-auto", className)} aria-hidden>
      <ellipse cx="100" cy="138" rx="56" ry="6" fill={TEAL} opacity="0.1" />
      <g data-float>
        <rect x="36" y="24" width="112" height="94" rx="12" fill="#fff" stroke={TEAL} strokeOpacity="0.25" strokeWidth="2" />
        <rect x="46" y="34" width="44" height="30" rx="6" fill={TURQ} opacity="0.3" />
        <rect x="96" y="34" width="42" height="30" rx="6" fill={SUN} opacity="0.7" />
        <rect x="46" y="70" width="92" height="38" rx="6" fill={MINT} stroke={TEAL} strokeOpacity="0.12" strokeWidth="2" />
        <path d="M54 98l14-10 12 6 18-14 14 8 16-10" fill="none" stroke={CORAL} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g data-bounce>
        <rect x="128" y="82" width="40" height="40" rx="9" fill={TEAL} />
        <rect x="136" y="82" width="22" height="13" rx="2" fill={MINT} />
        <rect x="150" y="85" width="4" height="7" rx="1" fill={TEAL} />
        <rect x="136" y="104" width="24" height="12" rx="2.5" fill={TURQ} />
      </g>
      <g data-twinkle>
        <circle cx="170" cy="78" r="9" fill={SUN} />
        <path d="M166 78l3 3 5-6" fill="none" stroke={TEAL} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <circle data-twinkle cx="26" cy="40" r="3.5" fill={CORAL} />
    </svg>
  );
}
