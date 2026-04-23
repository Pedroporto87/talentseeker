import type { Metadata } from "next";
import { Manrope, Newsreader } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

const sans = Manrope({
  variable: "--font-app-sans",
  subsets: ["latin"],
});

const serif = Newsreader({
  variable: "--font-app-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TalentSeeker AI",
  description: "Suite de RH com matching semântico de currículos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${serif.variable} h-full antialiased`}>
      <body className="min-h-full font-sans text-slate-900">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
