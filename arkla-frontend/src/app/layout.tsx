import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SidebarProvider } from "@/lib/sidebar-context";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2C5F6F",
};

export const metadata: Metadata = {
  title: "ARKLA - Sistem Arsip Cerdas",
  description: "Sistem Arsip Cerdas DPRD Kabupaten Sleman",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ARKLA",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${inter.variable} font-sans antialiased`}>
        <SidebarProvider>{children}</SidebarProvider>
      </body>
    </html>
  );
}
