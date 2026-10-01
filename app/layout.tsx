import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { LazyToaster } from "@/components/ui/lazy-toaster";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Commercial Finance 2",
    template: "%s · Commercial Finance 2",
  },
  description: "Dashboard monitoring invoice, payment, ekspor, dan KPI Commercial Finance 2.",
};

export const viewport: Viewport = {
  themeColor: "#174D55",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ConfirmProvider>{children}</ConfirmProvider>
        <LazyToaster />
      </body>
    </html>
  );
}
