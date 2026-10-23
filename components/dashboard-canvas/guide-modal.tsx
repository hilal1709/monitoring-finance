"use client";

import { useState } from "react";
import type { Swiper as SwiperInstance } from "swiper";
import { Button } from "@/components/ui/button";
import { Carousel } from "@/components/ui/carousel";
import { Lottie, type LottieName } from "@/components/ui/lottie";
import { Modal } from "@/components/ui/modal";

const steps: { art: LottieName; title: string; body: string; tips: string[] }[] = [
  {
    art: "guide-drag",
    title: "Geser & ubah ukuran",
    body: "Tekan Atur Dashboard di kanan atas. Tarik widget dari bagian atasnya untuk memindah, tarik sudut kanan bawah untuk mengubah ukuran.",
    tips: ["Widget lain otomatis bergeser memberi tempat.", "Salah geser? Tekan Urungkan di toolbar bawah."],
  },
  {
    art: "guide-chart-type",
    title: "Ganti jenis grafik",
    body: "Klik ikon pensil pada widget. Di langkah 2 pilih gambar grafik yang diinginkan — yang bertanda Disarankan paling cocok untuk data Anda.",
    tips: ["Batang mendatar cocok untuk peringkat (Top 10).", "Garis cocok untuk tren bulanan."],
  },
  {
    art: "guide-add-data",
    title: "Tambah grafik, card & filter",
    body: "Tekan Tambah. Pilih sumber data, lalu klik kolom: kolom hijau jadi kelompok, kolom kuning jadi angka. Card bisa menampilkan perbandingan MoM, YoY, atau YTD.",
    tips: ["MoM = vs bulan lalu, YoY = vs bulan sama tahun lalu.", "YTD = Januari s.d. bulan acuan vs periode sama tahun lalu."],
  },
  {
    art: "guide-upload",
    title: "Pakai data sendiri",
    body: "Di langkah Pilih data, tekan Upload Excel / CSV. Kami menebak jenis tiap kolom; ubah bila keliru, lalu simpan.",
    tips: ["Baris pertama harus berisi judul kolom.", "Kolom tanggal membuat grafik tren & MoM/YoY/YTD bisa dipakai."],
  },
  {
    art: "guide-save",
    title: "Simpan atau kembalikan",
    body: "Tekan Simpan supaya semua orang melihat susunan baru. Batal membuang perubahan. Menu ⋯ berisi Riwayat versi dan Kembalikan ke tampilan awal.",
    tips: ["Perubahan yang belum disimpan tetap ada bila halaman tertutup.", "Riwayat menyimpan 20 versi terakhir."],
  },
];

/** "Panduan": five swipeable how-to slides, each with its own Lottie illustration. */
export default function GuideModal({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [swiper, setSwiper] = useState<SwiperInstance | null>(null);
  const last = index === steps.length - 1;

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      title="Panduan mengatur dashboard"
      description={`Langkah ${index + 1} dari ${steps.length}`}
      className="sm:max-w-xl"
      footer={
        <>
          <Button type="button" variant="ghost" disabled={index === 0} onClick={() => swiper?.slidePrev()}>
            Sebelumnya
          </Button>
          <Button type="button" variant={last ? "accent" : "default"} onClick={() => (last ? onClose() : swiper?.slideNext())}>
            {last ? "Mengerti" : "Berikutnya"}
          </Button>
        </>
      }
    >
      <Carousel
        onReady={setSwiper}
        onIndexChange={setIndex}
        slides={steps.map((step, position) => (
          <div key={step.title} className="grid gap-3 text-left">
            <div className="grid h-44 place-items-center rounded-xl bg-[linear-gradient(135deg,rgba(78,205,196,0.18),rgba(255,230,109,0.25))]">
              {Math.abs(position - index) <= 1 ? <Lottie name={step.art} className="h-40 w-56" /> : null}
            </div>
            <h3 className="text-base font-bold text-teal">{step.title}</h3>
            <p className="text-sm leading-6 text-teal/90">{step.body}</p>
            <ul className="grid gap-1 rounded-lg bg-muted/60 p-3 text-xs font-semibold text-teal">
              {step.tips.map((tip) => (
                <li key={tip} className="flex gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-turquoise" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        ))}
      />
    </Modal>
  );
}
