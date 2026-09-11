'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { acceptCurrentCompliance } from '@/app/actions/compliance';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { COMPLIANCE_MINIMUM_AGE, type ComplianceStatus } from '@/lib/compliance-policy';

interface OnboardingFormProps {
  status: ComplianceStatus;
  continueTo: string;
}

export function OnboardingForm({ status, continueTo }: OnboardingFormProps) {
  const [termsAccepted, setTermsAccepted] = useState(Boolean(status.terms.acceptedAt));
  const [privacyAccepted, setPrivacyAccepted] = useState(Boolean(status.privacy.acceptedAt));
  const [age16Confirmed, setAge16Confirmed] = useState(Boolean(status.age16ConfirmedAt));
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!termsAccepted || !privacyAccepted || !age16Confirmed) {
      setMessage('Confirm the age requirement and accept both current documents to continue.');
      return;
    }

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

      router.replace(continueTo);
    });
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
          <fieldset className="space-y-3">
            <legend className="text-foreground mb-3 text-sm font-semibold">
              Review and confirm
            </legend>

            <div className="border-border/60 bg-muted/20 hover:border-primary/40 rounded-2xl border text-sm transition-colors">
              <div className="flex items-start gap-3 p-4">
                <Checkbox
                  id="terms-accepted"
                  checked={termsAccepted}
                  onCheckedChange={checked => setTermsAccepted(checked === true)}
                  required
                  aria-labelledby="terms-accepted-label"
                  className="mt-1 size-5"
                />
                <label
                  id="terms-accepted-label"
                  htmlFor="terms-accepted"
                  className="text-foreground min-w-0 cursor-pointer leading-6"
                >
                  I have read and agree to the{' '}
                  <Link
                    href="/terms"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline"
                  >
                    Terms of Service
                  </Link>{' '}
                  (version {status.terms.version}).
                </label>
              </div>
            </div>

            <div className="border-border/60 bg-muted/20 hover:border-primary/40 rounded-2xl border text-sm transition-colors">
              <div className="flex items-start gap-3 p-4">
                <Checkbox
                  id="privacy-accepted"
                  checked={privacyAccepted}
                  onCheckedChange={checked => setPrivacyAccepted(checked === true)}
                  required
                  aria-labelledby="privacy-accepted-label"
                  className="mt-1 size-5"
                />
                <label
                  id="privacy-accepted-label"
                  htmlFor="privacy-accepted"
                  className="text-foreground min-w-0 cursor-pointer leading-6"
                >
                  I have read and acknowledge the{' '}
                  <Link
                    href="/privacy"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline"
                  >
                    Privacy Policy
                  </Link>{' '}
                  (version {status.privacy.version}).
                </label>
              </div>
            </div>

            <div className="border-border/60 bg-muted/20 hover:border-primary/40 rounded-2xl border text-sm transition-colors">
              <div className="flex items-start gap-3 p-4">
                <Checkbox
                  id="age-confirmed"
                  checked={age16Confirmed}
                  onCheckedChange={checked => setAge16Confirmed(checked === true)}
                  required
                  aria-labelledby="age-confirmed-label"
                  className="mt-1 size-5"
                />
                <label
                  id="age-confirmed-label"
                  htmlFor="age-confirmed"
                  className="text-foreground min-w-0 cursor-pointer leading-6"
                >
                  I confirm that I am at least {COMPLIANCE_MINIMUM_AGE} years old.
                </label>
              </div>
            </div>
          </fieldset>

          {message && (
            <p role="status" className="text-muted-foreground rounded-lg border p-3 text-sm">
              {message}
            </p>
          )}

          <Button
            type="submit"
            disabled={isPending}
            aria-busy={isPending}
            size="lg"
            className="w-full"
          >
            {isPending ? 'Saving…' : 'Confirm and continue'}
          </Button>
        </form>
      </section>
    </main>
  );
}
