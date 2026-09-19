import type { Metadata, Viewport } from "next";
import { Source_Sans_3 } from "next/font/google";
import "./globals.css";

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Meridian — Enterprise customer platform",
  description:
    "HubSpot-class CRM, sales, marketing, CMS, SEO, service, and AI — purpose-built for Triton Financial Solutions and Aether Digital Markets.",
  applicationName: "Meridian",
  appleWebApp: {
    capable: true,
    title: "Meridian",
    statusBarStyle: "black-translucent",
  },
  manifest: "/manifest.json",
  icons: {
    apple: "/apple-touch-icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0c1620",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
