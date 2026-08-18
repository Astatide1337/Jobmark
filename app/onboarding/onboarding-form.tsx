'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { acceptCurrentCompliance } from '@/app/actions/compliance';
import { COMPLIANCE_MINIMUM_AGE, type ComplianceStatus } from '@/lib/compliance-policy';

interface OnboardingFormProps {
  status: ComplianceStatus;
  userName: string | null | undefined;
  continueTo: string;
}

export function OnboardingForm({ status, userName, continueTo }: OnboardingFormProps) {
  const [termsAccepted, setTermsAccepted] = useState(Boolean(status.terms.acceptedAt));
  const [privacyAccepted, setPrivacyAccepted] = useState(Boolean(status.privacy.acceptedAt));
  const [age16Confirmed, setAge16Confirmed] = useState(Boolean(status.age16ConfirmedAt));
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isComplete, setIsComplete] = useState(status.isComplete);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const result = await acceptCurrentCompliance({
        termsAccepted,
        privacyAccepted,
        age16Confirmed,
      });

      if (!result.success) {
        setMessage(result.message);
        return;
      }

      setIsComplete(result.status.isComplete);
      setMessage('Your account setup is complete.');
    });
  }

  if (isComplete) {
    return (
      <main className="bg-background flex min-h-screen items-center justify-center px-6 py-16">
        <section className="border-border bg-card w-full max-w-xl rounded-2xl border p-8 shadow-sm sm:p-10">
          <p className="text-primary mb-3 text-xs font-semibold tracking-widest uppercase">
            Account setup
          </p>
          <h1 className="text-foreground font-serif text-3xl font-semibold">You’re all set</h1>
          <p className="text-muted-foreground mt-4 leading-7">
            {userName ? `Thanks, ${userName}. ` : ''}Your eligibility confirmation and current Terms
            and Privacy acceptances are on file.
          </p>
          <Link
            href={`/api/compliance/continue?callbackUrl=${encodeURIComponent(continueTo)}`}
            className="bg-primary text-primary-foreground mt-8 inline-flex rounded-lg px-5 py-3 text-sm font-medium transition-opacity hover:opacity-90"
          >
            Continue to Jobmark
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="bg-background flex min-h-screen items-center justify-center px-6 py-16">
      <section className="border-border bg-card w-full max-w-xl rounded-2xl border p-8 shadow-sm sm:p-10">
        <p className="text-primary mb-3 text-xs font-semibold tracking-widest uppercase">
          Account setup
        </p>
        <h1 className="text-foreground font-serif text-3xl leading-tight font-semibold">
          A quick confirmation before you begin
        </h1>
        <p className="text-muted-foreground mt-4 leading-7">
          Jobmark is intended for people who are at least {COMPLIANCE_MINIMUM_AGE} years old, or
          older where local law requires it. Please review the current documents and confirm the
          statements below.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="text-foreground flex gap-3 text-sm leading-6">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={event => setTermsAccepted(event.target.checked)}
              required
              className="accent-primary mt-1 h-4 w-4 shrink-0"
            />
            <span>
              I have read and agree to the{' '}
              <Link href="/terms" target="_blank" className="text-primary underline">
                Terms of Service
              </Link>{' '}
              (version {status.terms.version}).
            </span>
          </label>

          <label className="text-foreground flex gap-3 text-sm leading-6">
            <input
              type="checkbox"
              checked={privacyAccepted}
              onChange={event => setPrivacyAccepted(event.target.checked)}
              required
              className="accent-primary mt-1 h-4 w-4 shrink-0"
            />
            <span>
              I have read and acknowledge the{' '}
              <Link href="/privacy" target="_blank" className="text-primary underline">
                Privacy Policy
              </Link>{' '}
              (version {status.privacy.version}).
            </span>
          </label>

          <label className="text-foreground flex gap-3 text-sm leading-6">
            <input
              type="checkbox"
              checked={age16Confirmed}
              onChange={event => setAge16Confirmed(event.target.checked)}
              required
              className="accent-primary mt-1 h-4 w-4 shrink-0"
            />
            <span>I confirm that I am at least {COMPLIANCE_MINIMUM_AGE} years old.</span>
          </label>

          {message && (
            <p role="status" className="text-muted-foreground rounded-lg border p-3 text-sm">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="bg-primary text-primary-foreground w-full rounded-lg px-5 py-3 text-sm font-medium transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Saving…' : 'Confirm and continue'}
          </button>
        </form>
      </section>
    </main>
  );
}
