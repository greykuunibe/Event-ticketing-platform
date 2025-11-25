import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  weight: ["300", "400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Event Ticketing Platform",
  description: "A lightweight ticketing solution for small communities who want to manage their events easily and securely.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} bg-stone-100 text-zinc-800 font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
