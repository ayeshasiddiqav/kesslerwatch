import type { Metadata } from "next";
import { Geist_Mono, Hanken_Grotesk, Newsreader } from "next/font/google";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
});

const hanken = Hanken_Grotesk({ variable: "--font-hanken", subsets: ["latin"], weight: ["500", "600"] });

const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], weight: ["500"] });

export const metadata: Metadata = {
  title: "KesslerWatch",
  description: "Space debris conjunction and re-entry risk",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${newsreader.variable} ${hanken.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
