import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | Jobmark',
  description: 'Terms of use for the Jobmark application.',
};

export default function TermsPage() {
  return (
    <main className="bg-background min-h-screen">
      <div className="mx-auto max-w-2xl px-6 py-16 sm:py-24">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground mb-10 inline-flex text-sm transition-colors"
        >
          ← Jobmark
        </Link>

        <header className="mb-12">
          <p className="text-primary mb-3 text-xs font-semibold uppercase tracking-widest">
            Legal
          </p>
          <h1 className="text-foreground font-serif text-4xl font-semibold leading-tight">
            Terms of Service
          </h1>
          <p className="text-muted-foreground mt-4 text-sm">Last updated March 31, 2026</p>
        </header>

        <div className="text-muted-foreground space-y-10 text-sm leading-7">
          <section>
            <h2 className="text-foreground font-serif mb-3 text-xl font-semibold">Acceptance</h2>
            <p>
              By accessing Jobmark, you agree to these terms. If you don&apos;t agree, please
              don&apos;t use the service.
            </p>
          </section>

          <section>
            <h2 className="text-foreground font-serif mb-3 text-xl font-semibold">
              What Jobmark is
            </h2>
            <p>
              Jobmark is a career record-keeping tool. It helps you log work accomplishments,
              generate performance summaries, and manage professional contacts. It is a personal
              productivity aid, not a professional HR, legal, or career counseling service.
            </p>
          </section>

          <section>
            <h2 className="text-foreground font-serif mb-3 text-xl font-semibold">
              Your responsibilities
            </h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>You are responsible for the accuracy of the content you enter.</li>
              <li>
                Do not use Jobmark to store or process information that is illegal, harmful, or
                violates others&apos; rights.
              </li>
              <li>One account per person. Do not share credentials.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-foreground font-serif mb-3 text-xl font-semibold">
              AI-generated content disclaimer
            </h2>
            <p>
              Jobmark uses AI to help draft reports, messages, and summaries. AI outputs are
              suggestions only. They are not professional career advice, legal advice, or HR
              guidance. Always review and verify AI-generated content before using it
              professionally.
            </p>
          </section>

          <section>
            <h2 className="text-foreground font-serif mb-3 text-xl font-semibold">
              Account termination
            </h2>
            <p>
              You may delete your account at any time from{' '}
              <Link href="/settings" className="text-primary hover:underline">
                Settings → Data
              </Link>
              . We reserve the right to suspend or terminate accounts that violate these terms.
            </p>
          </section>

          <section>
            <h2 className="text-foreground font-serif mb-3 text-xl font-semibold">
              Limitation of liability
            </h2>
            <p>
              Jobmark is provided &quot;as is.&quot; We make no guarantees of uptime, accuracy, or
              fitness for a specific purpose. To the maximum extent permitted by law, Jobmark is not
              liable for any indirect, incidental, or consequential damages arising from your use of
              the service.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
