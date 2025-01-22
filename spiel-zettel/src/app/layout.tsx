import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { name } from "./helper/info";

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
  title: name,
  description: "Use your favorite game papers on the go",
  // Reference files from the 'public' directory
  icons: [
    { rel: "icon", url: "./favicon.svg" },
    { rel: "shortcut icon", url: "./favicon.ico" },
  ],
  manifest: "./manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
