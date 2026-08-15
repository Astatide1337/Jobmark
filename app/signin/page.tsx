import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GoogleIcon } from '@/components/auth/google-icon';
import { signInWithDevUser, signInWithGoogle } from '@/app/actions/auth';

export const metadata: Metadata = {
  title: 'Sign in | Jobmark',
  description: 'Sign in to your Jobmark career record.',
};

type SignInPageProps = {
  searchParams: Promise<{
    callbackUrl?: string;
    error?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  Configuration: 'Sign-in is temporarily unavailable. Please try again in a moment.',
  AccessDenied: 'Sign-in was cancelled. You can try again whenever you’re ready.',
  OAuthSignin: 'Google sign-in could not be started. Please try again.',
  OAuthCallback: 'Google could not finish signing you in. Please try again.',
  OAuthAccountNotLinked: 'That Google account is already linked to another sign-in method.',
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const callbackUrl = typeof params.callbackUrl === 'string' ? params.callbackUrl : '/dashboard';
  const error = typeof params.error === 'string' ? errorMessages[params.error] : undefined;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-12 sm:px-8">
      <div
        aria-hidden="true"
        className="bg-primary/10 pointer-events-none absolute -top-48 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full blur-3xl"
      />
      <div
        aria-hidden="true"
        className="bg-accent/10 pointer-events-none absolute -right-40 bottom-[-12rem] h-[28rem] w-[28rem] rounded-full blur-3xl"
      />

      <section className="glass-card warm-glow relative z-10 w-full max-w-md px-6 py-8 sm:px-10 sm:py-10">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground mb-10 inline-flex items-center gap-2 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Jobmark
        </Link>

        <div className="mb-8 text-center">
          <div className="bg-primary/15 border-primary/25 shadow-primary/10 mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border shadow-lg">
            <PenLine className="text-primary h-6 w-6" aria-hidden="true" />
          </div>
          <p className="text-primary mb-3 text-xs font-semibold tracking-[0.24em] uppercase">
            Jobmark
          </p>
          <h1 className="editorial-heading text-3xl sm:text-4xl">Welcome back</h1>
          <p className="text-muted-foreground mt-3 text-sm leading-6">
            Keep your work, progress, and impact in one place.
          </p>
        </div>

        {error ? (
          <p
            role="alert"
            className="border-destructive/30 bg-destructive/10 text-destructive-text mb-4 rounded-xl border px-4 py-3 text-sm leading-5"
          >
            {error}
          </p>
        ) : null}

        <form action={signInWithGoogle}>
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <Button
            type="submit"
            variant="outline"
            size="lg"
            className="border-border/70 bg-background/50 hover:border-primary/50 hover:bg-primary/10 h-12 w-full text-sm font-semibold shadow-none"
          >
            <GoogleIcon className="h-5 w-5" />
            Continue with Google
          </Button>
        </form>

        {process.env.NODE_ENV === 'development' && (
          <>
            <div className="text-muted-foreground my-4 flex items-center gap-3 text-[11px] tracking-wider uppercase">
              <span className="bg-border/50 h-px flex-1" />
              <span>Local development</span>
              <span className="bg-border/50 h-px flex-1" />
            </div>
            <form action={signInWithDevUser}>
              <input type="hidden" name="callbackUrl" value={callbackUrl} />
              <Button type="submit" size="lg" className="h-12 w-full text-sm font-semibold">
                Continue as Demo User
              </Button>
            </form>
          </>
        )}

        <p className="text-muted-foreground mt-7 text-center text-xs leading-5">
          By continuing, you agree to Jobmark’s{' '}
          <Link href="/terms" className="text-foreground underline-offset-4 hover:underline">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-foreground underline-offset-4 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
