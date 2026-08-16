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
import { auth } from '@/lib/auth';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jobmark.astatide.com';
const productDescription =
  'Jobmark gives you a simple place to record your work while it is fresh, then find it when reviews, updates, and next steps matter.';

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
  metadataBase: new URL(siteUrl),
  title: 'Jobmark - Keep your work on record',
  description: productDescription,
  icons: {
    icon: '/brand/jobmark-logo.svg',
  },
  keywords: [
    'career record',
    'work evidence',
    'performance review',
    'promotion prep',
    'work log',
    'impact tracking',
  ],
  openGraph: {
    title: 'Jobmark - Keep your work on record',
    description: productDescription,
    url: siteUrl,
    siteName: 'Jobmark',
    type: 'website',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'Jobmark – Your Career, On Record',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Jobmark - Keep your work on record',
    description: productDescription,
    images: ['/opengraph-image.png'],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en" className="dark overflow-x-clip" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistMono.variable} ${playfair.variable} overflow-x-clip font-sans antialiased`}
      >
        <SettingsProvider isAuthenticated={Boolean(session?.user?.id)}>
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
