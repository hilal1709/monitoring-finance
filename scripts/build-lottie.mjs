// Generates the onboarding/saving Lottie animations in public/lottie/ from code,
// so they stay tiny (a few KB each) and use only the palette colors.
//
//   node scripts/build-lottie.mjs
//
// Every animation is 120×120 at 60 fps, built from plain shape layers (rects,
// ellipses, paths, trim paths) that the SVG renderer in components/ui/lottie.tsx
// handles without extra features.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "lottie");
const SIZE = 120;
const FPS = 60;

const PALETTE = {
  teal: "#174D55",
  turquoise: "#4ECDC4",
  mint: "#F7FFF7",
  coral: "#FF6B6B",
  sun: "#FFE66D",
  white: "#FFFFFF",
};

const rgba = (hex) => {
  const value = Number.parseInt(hex.slice(1), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255, 1].map((n) => Number(n.toFixed(4)));
};

// ---- Property helpers --------------------------------------------------------

const still = (k) => ({ a: 0, k });

const EASE = {
  inOut: { o: 0.55, i: 0.45 },
  out: { o: 0.2, i: 0.2 },
  back: { o: 0.34, i: 0.64, overshoot: true },
};

/**
 * Animated property from [frame, value] pairs. Values may be numbers or arrays;
 * every key eases with `ease` (bezier handles shared across dimensions).
 */
function keys(pairs, ease = EASE.inOut) {
  return {
    a: 1,
    k: pairs.map(([t, value], index) => {
      const s = Array.isArray(value) ? value : [value];
      if (index === pairs.length - 1) return { t, s };
      const dims = s.length;
      const fill = (n) => Array(dims).fill(n);
      return {
        t,
        s,
        o: { x: fill(ease.o), y: fill(0) },
        i: { x: fill(ease.i), y: fill(ease.overshoot ? 1.56 : 1) },
      };
    }),
  };
}

const prop = (value) => (value && typeof value === "object" && "a" in value ? value : still(value));

// ---- Shape helpers -----------------------------------------------------------

const rect = (w, h, r = 0, p = [0, 0]) => ({ ty: "rc", d: 1, s: prop([w, h]), p: prop(p), r: prop(r) });
const ellipse = (w, h, p = [0, 0]) => ({ ty: "el", d: 1, s: prop([w, h]), p: prop(p) });
const fill = (color, opacity = 100) => ({ ty: "fl", c: still(rgba(PALETTE[color])), o: prop(opacity), r: 1 });
const stroke = (color, width, opacity = 100) => ({ ty: "st", c: still(rgba(PALETTE[color])), o: prop(opacity), w: still(width), lc: 2, lj: 2 });
const trim = (start, end) => ({ ty: "tm", s: prop(start), e: prop(end), o: still(0), m: 1 });

/** Polyline/polygon from points (straight segments). */
const path = (points, closed = false) => ({
  ty: "sh",
  ks: still({ i: points.map(() => [0, 0]), o: points.map(() => [0, 0]), v: points, c: closed }),
});

const transform = ({ p = [0, 0], a = [0, 0], s = [100, 100], r = 0, o = 100 } = {}) => ({
  ty: "tr",
  p: prop(p),
  a: prop(a),
  s: prop(s),
  r: prop(r),
  o: prop(o),
  sk: still(0),
  sa: still(0),
});

const group = (items, tr) => ({ ty: "gr", it: [...items, transform(tr)] });

// ---- Layers & documents ------------------------------------------------------

let layerIndex = 0;

/** A shape layer; transform values may be static or `keys(...)`. */
function layer(name, shapes, { p = [SIZE / 2, SIZE / 2], a = [0, 0], s = [100, 100], r = 0, o = 100 } = {}) {
  const pad3 = (value, z) => {
    const v = prop(value);
    if (v.a === 0) return still([...v.k, z]);
    return { a: 1, k: v.k.map((key) => ({ ...key, s: [...key.s, z], ...(key.o ? { o: { x: [...key.o.x, key.o.x[0]], y: [...key.o.y, 0] }, i: { x: [...key.i.x, key.i.x[0]], y: [...key.i.y, 1] } } : {}) })) };
  };
  return {
    ddd: 0,
    ind: ++layerIndex,
    ty: 4,
    nm: name,
    sr: 1,
    ao: 0,
    bm: 0,
    st: 0,
    ip: 0,
    op: 0, // filled in by doc()
    ks: { o: prop(o), r: prop(r), p: pad3(p, 0), a: pad3(a, 0), s: pad3(s, 100) },
    shapes,
  };
}

/** Lottie document; `layers` are listed top-most first. */
function doc(name, frames, layers) {
  layerIndex = 0;
  return {
    v: "5.7.4",
    fr: FPS,
    ip: 0,
    op: frames,
    w: SIZE,
    h: SIZE,
    nm: name,
    ddd: 0,
    assets: [],
    layers: layers.map((entry) => ({ ...entry, op: frames })),
  };
}

const cursor = (color = "sun") =>
  group([path([[0, 0], [0, 22], [6, 16], [11, 26], [15, 24], [10, 14], [18, 14]], true), stroke("teal", 2.5), fill(color)]);

// ---- Animations --------------------------------------------------------------

/** A tile lifted from one grid slot into another while a pointer drags it. */
function guideDrag() {
  const F = 150;
  const move = (from, to) => keys([[0, from], [25, from], [80, to], [115, to], [140, from], [F, from]]);
  return doc("guide-drag", F, [
    layer("cursor", [cursor()], { p: move([46, 46], [86, 86]) }),
    layer("tile", [group([rect(36, 30, 6), fill("white"), stroke("turquoise", 3)]), group([rect(5, 10, 1.5, [-8, 4]), fill("turquoise")]), group([rect(5, 16, 1.5, [0, 1]), fill("sun")]), group([rect(5, 12, 1.5, [8, 3]), fill("coral")])], {
      p: move([38, 38], [78, 78]),
      s: keys([[0, [100, 100]], [20, [100, 100]], [28, [108, 108]], [80, [108, 108]], [92, [100, 100]], [F, [100, 100]]]),
    }),
    layer("target", [group([rect(36, 30, 6), stroke("turquoise", 2, 100)])], {
      p: [78, 78],
      o: keys([[0, 20], [40, 100], [80, 100], [100, 0], [130, 0], [F, 20]]),
    }),
    layer("grid", [
      group([rect(36, 30, 6, [-20, -20]), fill("teal", 10)]),
      group([rect(36, 30, 6, [20, -20]), fill("teal", 10)]),
      group([rect(36, 30, 6, [-20, 20]), fill("teal", 10)]),
      group([rect(36, 30, 6, [20, 20]), fill("teal", 6)]),
    ], { p: [58, 58] }),
    layer("board", [group([rect(100, 92, 14), fill("mint")])], { p: [58, 58] }),
  ]);
}

/** Bar, line and donut cards; each one is highlighted in turn. */
function guideChartType() {
  const F = 180;
  const pop = (start) =>
    keys([[0, [100, 100]], [start, [100, 100]], [start + 12, [116, 116]], [start + 50, [116, 116]], [start + 60, [100, 100]], [F, [100, 100]]], EASE.back);
  const ring = (start) => keys([[0, 0], [start, 0], [start + 10, 100], [start + 50, 100], [start + 58, 0], [F, 0]]);
  const card = (inner) => [...inner, group([rect(30, 40, 7), fill("white"), stroke("teal", 2, 25)])];
  const cards = [
    { x: 24, at: 0, shapes: card([group([rect(5, 10, 1.5, [-7, 8]), fill("turquoise")]), group([rect(5, 18, 1.5, [0, 4]), fill("sun")]), group([rect(5, 13, 1.5, [7, 6.5]), fill("coral")])]) },
    { x: 60, at: 60, shapes: card([group([path([[-9, 8], [-3, 0], [3, 4], [9, -6]]), stroke("coral", 2.5)])]) },
    { x: 96, at: 120, shapes: card([group([ellipse(18, 18), stroke("turquoise", 5)]), group([path([[0, -9], [6, -6.5], [9, 0]]), stroke("sun", 5)])]) },
  ];
  return doc("guide-chart-type", F, [
    ...cards.map(({ x, at }) => layer(`ring-${x}`, [group([rect(38, 48, 10), stroke("turquoise", 3)])], { p: [x, 60], s: pop(at), o: ring(at) })),
    ...cards.map(({ x, at, shapes }) => layer(`card-${x}`, shapes, { p: [x, 60], s: pop(at) })),
  ]);
}

/** Data rows slide into a card one after another; a plus badge pulses. */
function guideAddData() {
  const F = 150;
  const row = (index) => {
    const start = 15 + index * 18;
    return layer(`row-${index}`, [group([rect(14, 6, 3, [-18, 0]), fill("teal", 25)]), group([rect(26, 6, 3, [6, 0]), fill(index === 1 ? "sun" : "turquoise", index === 1 ? 100 : 70)])], {
      p: keys([[0, [70, 44 + index * 14]], [start, [70, 44 + index * 14]], [start + 20, [54, 44 + index * 14]], [F, [54, 44 + index * 14]]], EASE.out),
      o: keys([[0, 0], [start, 0], [start + 14, 100], [120, 100], [138, 0], [F, 0]]),
    });
  };
  return doc("guide-add-data", F, [
    layer("plus", [group([path([[0, -7], [0, 7]]), path([[-7, 0], [7, 0]]), stroke("teal", 3.5)]), group([ellipse(26, 26), fill("turquoise")])], {
      p: [90, 88],
      s: keys([[0, [100, 100]], [10, [118, 118]], [24, [100, 100]], [F, [100, 100]]], EASE.back),
    }),
    row(0),
    row(1),
    row(2),
    row(3),
    layer("header", [group([rect(56, 10, 4), fill("turquoise")])], { p: [54, 30] }),
    layer("card", [group([rect(64, 78, 10), fill("white"), stroke("teal", 2, 25)])], { p: [54, 60] }),
  ]);
}

/** A spreadsheet rises into a tray while an arrow bounces upward. */
function guideUpload() {
  const F = 120;
  return doc("guide-upload", F, [
    layer("arrow", [group([path([[0, 12], [0, -10]]), path([[-8, -2], [0, -10], [8, -2]]), stroke("teal", 4)]), group([ellipse(32, 32), fill("sun")])], {
      p: keys([[0, [86, 84]], [30, [86, 76]], [60, [86, 84]], [90, [86, 76]], [F, [86, 84]]]),
    }),
    layer("file", [
      group([rect(9, 4, 2, [-4, 2]), fill("teal", 25)]),
      group([rect(16, 4, 2, [0, 10]), fill("teal", 18)]),
      group([rect(30, 9, 4, [0, -14]), fill("turquoise")]),
      group([rect(30, 38, 5), fill("white"), stroke("teal", 2, 30)]),
    ], {
      p: keys([[0, [52, 82]], [45, [52, 52]], [85, [52, 52]], [100, [52, 82]], [F, [52, 82]]]),
      o: keys([[0, 0], [12, 100], [85, 100], [98, 0], [F, 0]]),
    }),
    layer("tray", [group([path([[-36, -8], [-36, 8], [36, 8], [36, -8]]), stroke("teal", 4)])], { p: [56, 96] }),
    layer("glow", [group([ellipse(84, 84), fill("turquoise", 14)])], { p: [56, 60] }),
  ]);
}

/** A save badge pops in and a checkmark draws over it. */
function guideSave() {
  const F = 120;
  return doc("guide-save", F, [
    layer("check", [group([path([[-7, 0], [-2, 5], [8, -6]]), stroke("teal", 3), trim(0, keys([[0, 0], [40, 0], [58, 100], [100, 100], [110, 0], [F, 0]]))])], { p: [84, 36] }),
    layer("check-badge", [group([ellipse(24, 24), fill("sun")])], {
      p: [84, 36],
      s: keys([[0, [0, 0]], [30, [0, 0]], [44, [100, 100]], [100, [100, 100]], [110, [0, 0]], [F, [0, 0]]], EASE.back),
    }),
    layer("disk", [
      group([rect(26, 14, 3, [0, 14]), fill("turquoise")]),
      group([rect(4, 8, 1, [6, -16]), fill("teal")]),
      group([rect(22, 13, 2, [0, -15]), fill("mint")]),
      group([rect(44, 44, 9), fill("teal")]),
    ], {
      p: [58, 64],
      s: keys([[0, [70, 70]], [18, [104, 104]], [28, [100, 100]], [F, [100, 100]]], EASE.back),
    }),
    layer("glow", [group([ellipse(80, 80), fill("turquoise", 14)])], { p: [58, 64] }),
  ]);
}

/** Small looping "saving" spinner: a palette arc chasing around a track. */
function saving() {
  const F = 90;
  return doc("saving", F, [
    layer("dot", [group([ellipse(10, 10, [0, -30]), fill("sun")])], { r: keys([[0, 0], [F, 360]], { o: 0, i: 1 }) }),
    layer("arc", [group([ellipse(60, 60), stroke("turquoise", 8), trim(keys([[0, 0], [45, 0], [F, 100]]), keys([[0, 0], [45, 70], [F, 100]]))])], {
      r: keys([[0, 0], [F, 270]], { o: 0, i: 1 }),
    }),
    layer("track", [group([ellipse(60, 60), stroke("teal", 8, 12)])]),
  ]);
}

const animations = {
  "guide-drag": guideDrag,
  "guide-chart-type": guideChartType,
  "guide-add-data": guideAddData,
  "guide-upload": guideUpload,
  "guide-save": guideSave,
  saving,
};

mkdirSync(OUT_DIR, { recursive: true });
for (const [name, build] of Object.entries(animations)) {
  const json = JSON.stringify(build());
  writeFileSync(join(OUT_DIR, `${name}.json`), json);
  console.log(`${name}.json  ${(json.length / 1024).toFixed(1)} KB`);
}
