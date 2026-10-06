import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ServiceWorker } from "@/components/service-worker";
import "./globals.css";

const bricolage = localFont({
  src: "../fonts/bricolage.woff2",
  variable: "--font-bricolage",
  weight: "200 800",
  display: "swap",
});

const dmSans = localFont({
  src: [
    { path: "../fonts/dm-sans.woff2", style: "normal", weight: "100 1000" },
    { path: "../fonts/dm-sans-italic.woff2", style: "italic", weight: "100 1000" },
  ],
  variable: "--font-dm-sans",
  display: "swap",
});

const instrument = localFont({
  src: [
    { path: "../fonts/instrument-serif.woff2", style: "normal", weight: "400" },
    { path: "../fonts/instrument-serif-italic.woff2", style: "italic", weight: "400" },
  ],
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Deluj — One Deluj. Every order. Connected.",
    template: "%s · Deluj",
  },
  description:
    "The Deluj digital operating system: order from your table, a live kitchen display and the owner's command center — connected in realtime.",
  applicationName: "Deluj",
  appleWebApp: { capable: true, title: "Deluj", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/brand/icon-192.png", type: "image/png", sizes: "192x192" }],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#fb4e12",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bricolage.variable} ${dmSans.variable} ${instrument.variable} antialiased`}>
      <body className="min-h-dvh">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
