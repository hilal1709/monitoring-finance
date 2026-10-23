"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { withMotion } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/motion";

const steps = [
  { target: "dock", title: "Ini toolbar mengatur", body: "Semua alat ada di sini: tambah widget, urungkan, panduan, lalu Simpan." },
  {
    target: "edit-widget",
    title: "Ubah satu widget",
    body: "Klik pensil untuk mengganti data, jenis grafik, warna, atau perbandingan MoM/YoY/YTD. Tarik bagian atas widget untuk memindah, sudut kanan bawah untuk mengubah ukuran.",
  },
  { target: "add-widget", title: "Tambah grafik, card, atau filter", body: "Mulai dari kosong atau pilih template yang sudah jadi." },
  { target: "guide", title: "Butuh bantuan?", body: "Panduan berisi langkah bergambar. Tur ini bisa diputar ulang dari menu Lainnya." },
  { target: "save", title: "Jangan lupa simpan", body: "Setelah disimpan, semua orang yang membuka halaman ini melihat susunan baru." },
];

const PAD = 6;
const CARD_WIDTH = 320;

/**
 * First-run coachmarks for edit mode: a spotlight (after Aceternity's Spotlight)
 * glides between the real controls while a card explains each one.
 */
export default function CanvasTour({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const step = steps[index];

  // Steps whose control isn't on screen (yet) are skipped.
  useLayoutEffect(() => {
    const find = () => document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    const target = find();
    if (!target) {
      const timer = window.setTimeout(() => {
        const late = find();
        if (late) setRect(late.getBoundingClientRect());
        else if (index < steps.length - 1) setIndex(index + 1);
        else onDone();
      }, 500);
      return () => window.clearTimeout(timer);
    }
    target.scrollIntoView({ block: "nearest", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    const update = () => setRect(target.getBoundingClientRect());
    update();
    // The dock slides in on mount; measure again once it has settled.
    const settle = window.setTimeout(update, 600);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.clearTimeout(settle);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [step.target, index, onDone]);

  const shown = rect !== null;
  useEffect(() => {
    const card = cardRef.current;
    if (card) withMotion((gsap) => gsap.fromTo(card, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }));
  }, [index, shown]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDone();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDone]);

  if (!rect) return null;
  const below = rect.top < window.innerHeight / 2;
  const cardLeft = Math.min(Math.max(12, rect.left + rect.width / 2 - CARD_WIDTH / 2), window.innerWidth - CARD_WIDTH - 12);
  const last = index === steps.length - 1;

  return createPortal(
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Tur mengatur dashboard">
      <div
        className="pointer-events-none fixed rounded-xl shadow-[0_0_0_9999px_rgba(23,77,85,0.55)] ring-2 ring-sun transition-[top,left,width,height] duration-500 ease-out motion-reduce:transition-none"
        style={{ top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }}
      />
      <div
        ref={cardRef}
        className="fixed rounded-2xl bg-white p-4 text-teal shadow-[0_30px_60px_-20px_rgba(26,83,92,0.6)]"
        style={{ width: Math.min(CARD_WIDTH, window.innerWidth - 24), left: cardLeft, ...(below ? { top: rect.bottom + PAD + 12 } : { bottom: window.innerHeight - rect.top + PAD + 12 }) }}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-turquoise-ink">
          Tur {index + 1}/{steps.length}
        </p>
        <h3 className="mt-1 text-sm font-bold">{step.title}</h3>
        <p className="mt-1 text-xs leading-5 text-teal/90">{step.body}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={onDone}>
            Lewati
          </Button>
          <div className="flex gap-1.5">
            {index > 0 ? (
              <Button type="button" size="sm" variant="outline" onClick={() => setIndex(index - 1)}>
                Kembali
              </Button>
            ) : null}
            <Button type="button" size="sm" variant={last ? "accent" : "default"} onClick={() => (last ? onDone() : setIndex(index + 1))}>
              {last ? "Selesai" : "Lanjut"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
