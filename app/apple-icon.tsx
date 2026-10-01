import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const PETAL = "M0 -2.5C2.5 -14 12 -22.5 24 -22C24 -9 15 -0.5 2.5 1Z";

// Same mark as app/icon.svg, rasterised for iOS home-screen icons.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <svg width="180" height="180" viewBox="0 0 64 64">
        <rect width="64" height="64" fill="#174D55" />
        <g transform="translate(32 32)">
          <path d={PETAL} fill="#4ECDC4" />
          <path d={PETAL} fill="#FFE66D" transform="rotate(120)" />
          <path d={PETAL} fill="#FF6B6B" transform="rotate(240)" />
          <circle r="3.4" fill="#F7FFF7" />
        </g>
      </svg>
    ),
    size,
  );
}
