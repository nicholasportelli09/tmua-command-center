import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { DataProvider } from "@/lib/state/data-provider";
import { AppShell } from "@/components/layout/app-shell";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "TMUA Command Center",
  description: "Personal quantitative performance dashboard for TMUA preparation.",
};

export const viewport: Viewport = {
  themeColor: "#0a0b0e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="app-bg min-h-screen antialiased">
        <ToastProvider>
          <DataProvider>
            <AppShell>{children}</AppShell>
          </DataProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
