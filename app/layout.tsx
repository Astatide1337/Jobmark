import type { Metadata } from "next";
import { Inter, Geist_Mono, Playfair_Display } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { CommandPalette } from "@/components/ui/command-palette";
import { SettingsProvider } from "@/components/providers/settings-provider";
import { SmoothScrollProvider } from "@/components/providers/smooth-scroll-provider";
import { GrainOverlay } from "@/components/landing/grain-overlay";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Jobmark - Never Forget a Win Again",
  description: "The work journal that writes your reports for you. Capture accomplishments in 30 seconds, generate polished reports with AI.",
  keywords: ["productivity", "work tracker", "activity log", "AI reports", "accomplishment journal", "work journal"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistMono.variable} ${playfair.variable} font-sans antialiased`}
      >
        <SmoothScrollProvider>
          <SettingsProvider>
            {children}
            <CommandPalette />
            <Toaster position="bottom-right" />
          </SettingsProvider>
          <GrainOverlay />
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
