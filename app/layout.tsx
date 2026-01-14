import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { CommandPalette } from "@/components/ui/command-palette";
import { SettingsProvider } from "@/components/providers/settings-provider";
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

export const metadata: Metadata = {
  title: "Jobmark - Capture Your Daily Wins",
  description: "AI-powered work activity logger. Log accomplishments effortlessly, generate impressive reports instantly.",
  keywords: ["productivity", "work tracker", "activity log", "AI reports", "accomplishment journal"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <SettingsProvider>
          {children}
          <CommandPalette />
          <Toaster position="bottom-right" />
        </SettingsProvider>
      </body>
    </html>
  );
}
