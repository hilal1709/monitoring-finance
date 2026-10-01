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
