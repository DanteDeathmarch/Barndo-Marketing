import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ConciergeWidget from "@/components/ConciergeWidget";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BarndoBuilt — Build a Custom Barndominium on Your Land",
  description:
    "Own land in Texas, Tennessee, Oklahoma, or Louisiana? BarndoBuilt matches you with a vetted builder who handles design through move-in under one contract.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-cream text-ink">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <ConciergeWidget />
      </body>
    </html>
  );
}
