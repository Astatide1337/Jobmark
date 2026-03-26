/**
 * Root Application Layout
 *
 * Why: This is the entry point for the entire application's UI. It
 * initializes the global design system (fonts, grid, overlays) and
 * wraps the app in the necessary React Providers.
 *
 * Design Details:
 * - Font Parity: Combines Inter (sans), Geist Mono (code), and
 *   Playfair Display (serif) to achieve the "Premium Editorial" look.
 * - Grain Overlay: Adds a subtle SVG noise texture to the background
 *   to give the dark UI a physical, high-quality "paper" feel.
 * - Global Shortcuts: Hosts the `CommandPalette` to ensure search
 *   is available from every page.
 */
import type { Metadata } from 'next';
import { Inter, Geist_Mono, Playfair_Display } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { CommandPalette } from '@/components/ui/command-palette';
import { SettingsProvider } from '@/components/providers/settings-provider';
import { UIProvider, SmoothScrollProvider } from '@/components/providers/ui-provider';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const playfair = Playfair_Display({
  variable: '--font-serif',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Jobmark - Build Your Career Record',
  description:
    'Jobmark is a career OS for documenting work, building evidence of impact, and turning it into reviews, updates, and promotion-ready summaries.',
  keywords: [
    'career record',
    'work evidence',
    'performance review',
    'promotion prep',
    'work log',
    'impact tracking',
  ],
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
        <SettingsProvider>
          <UIProvider>
            <SmoothScrollProvider>
              {children}
              <CommandPalette />
              <Toaster position="bottom-right" richColors />
              <GrainOverlay />
            </SmoothScrollProvider>
          </UIProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}

function GrainOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
      }}
    />
  );
}
