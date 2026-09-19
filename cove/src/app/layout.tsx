import type { Metadata, Viewport } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const sans = Source_Sans_3({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const serif = Fraunces({ subsets: ["latin"], variable: "--font-serif", display: "swap" });

export const metadata: Metadata = {
  title: "Cove — Collections floor",
  description:
    "US consumer collections for states without a collection-agency license. Clock-in, authenticated voice/SMS/email, payments, skip trace, debtor CRM.",
  appleWebApp: { capable: true, title: "Cove", statusBarStyle: "default" },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#f4eee3",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
