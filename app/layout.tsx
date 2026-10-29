import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "SARPRAS - SMK Assalam Gegesik",
  description: "Sistem pencatatan sarana dan prasarana SMK Assalam Gegesik",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={jakarta.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}