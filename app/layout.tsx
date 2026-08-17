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
 * - Global chrome: Keeps theme setup and notifications available to every
 *   route. Authenticated-only tools are mounted inside the app shell.
 */
import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { Inter, Geist_Mono, Playfair_Display } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { SettingsProvider } from '@/components/providers/settings-provider';
import { getUserSettings, type UserSettingsData } from '@/app/actions/settings';
import { auth } from '@/lib/auth';
import { getThemePreset, getThemeSurfacePalette } from '@/lib/themes';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jobmark.astatide.com';
const productDescription =
  'Jobmark gives you a simple place to write down your work while it is fresh, then find it when reviews, updates, and next steps matter.';

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
  title: 'Jobmark - Keep your work notes',
  description: productDescription,
  icons: {
    icon: '/brand/jobmark-logo.svg',
  },
  keywords: ['work notes', 'reviews', 'updates', 'projects', 'goals', 'review notes'],
  openGraph: {
    title: 'Jobmark - Keep your work notes',
    description: productDescription,
    url: siteUrl,
    siteName: 'Jobmark',
    type: 'website',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'Jobmark: Keep your work notes',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Jobmark - Keep your work notes',
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
  const isAuthenticated = Boolean(session?.user?.id);
  const initialSettings = isAuthenticated ? await getUserSettings() : null;

  return (
    <AppDocument
      initialSettings={initialSettings}
      isAuthenticated={isAuthenticated}
      theme={getInitialTheme(initialSettings)}
    >
      {children}
    </AppDocument>
  );
}

interface InitialTheme {
  mode: string;
  className: 'light' | 'dark';
  style: CSSProperties;
}

function getInitialTheme(settings: UserSettingsData | null): InitialTheme {
  const preset = getThemePreset(settings?.themePreset ?? 'cafe') ?? getThemePreset('cafe');
  if (!preset) throw new Error('The default theme preset is missing.');
  const surfaces = getThemeSurfacePalette(preset.id);

  const mode = settings?.themeMode ?? 'dark';
  return {
    mode,
    className: mode === 'light' ? 'light' : 'dark',
    style: {
      ...surfaceVariables(surfaces.dark, 'dark'),
      ...surfaceVariables(surfaces.light, 'light'),
      '--primary': preset.colors.primary,
      '--primary-foreground': preset.colors.primaryForeground,
      '--accent': preset.colors.accent,
      '--accent-warm': preset.colors.accentWarm,
      '--accent-warm-hover': preset.colors.accentWarmHover,
      '--ring': preset.colors.ring,
      '--sidebar-primary': preset.colors.sidebarPrimary,
      '--sidebar-ring': preset.colors.sidebarRing,
      '--chart-1': preset.colors.chart1,
      '--chart-2': preset.colors.chart2,
      '--chart-3': preset.colors.chart3,
      '--chart-4': preset.colors.chart4,
      '--chart-5': preset.colors.chart5,
      '--success': preset.colors.success,
      '--warning': preset.colors.warning,
      '--info': preset.colors.info,
    } as CSSProperties,
  };
}

function surfaceVariables(
  surface: ReturnType<typeof getThemeSurfacePalette>['dark'],
  mode: 'dark' | 'light'
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(surface).map(([name, value]) => [
      `--theme-${mode}-${name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`,
      value,
    ])
  );
}

function AppDocument({
  children,
  initialSettings,
  isAuthenticated,
  theme,
}: {
  children: React.ReactNode;
  initialSettings: UserSettingsData | null;
  isAuthenticated: boolean;
  theme: InitialTheme;
}) {
  return (
    <html
      lang="en"
      className={`${theme.className} overflow-x-clip`}
      style={theme.style}
      suppressHydrationWarning
    >
      <body
        className={`${inter.variable} ${geistMono.variable} ${playfair.variable} overflow-x-clip font-sans antialiased`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var root=document.documentElement;var mode=${JSON.stringify(theme.mode)};var dark=mode==='dark'||(mode==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);root.classList.toggle('dark',dark);root.classList.toggle('light',!dark);})();`,
          }}
        />
        <SettingsProvider initialSettings={initialSettings} isAuthenticated={isAuthenticated}>
          {children}
          <Toaster position="bottom-right" richColors />
          <GrainOverlay />
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
