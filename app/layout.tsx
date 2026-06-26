import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Commercial Financial 2",
  description: "Invoice and payment monitoring dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Script id="theme-init" strategy="beforeInteractive">
          {`(() => {
          try {
            const storedTheme = window.localStorage.getItem('deptcontrol-theme');
            const theme = storedTheme === 'light' ? 'light' : 'dark';
            document.documentElement.dataset.theme = theme;
          } catch {
            document.documentElement.dataset.theme = 'dark';
          }
        })();`}
        </Script>
        {children}
      </body>
    </html>
  );
}
