import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Jobmark',
  description: 'How Jobmark collects, uses, and protects your data.',
};

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="text-muted-foreground mt-4 text-sm">Last updated March 31, 2026</p>
        </header>

        <div className="text-muted-foreground space-y-10 text-sm leading-7">
          <section>
            <h2 className="text-foreground font-serif mb-3 text-xl font-semibold">
              What we collect
            </h2>
            <p>
              When you sign in with Google, we receive your name, email address, and profile photo
              from Google. Inside the app, we store the work entries, projects, goals, and reports
              you create. We also store your settings preferences and, if you choose to use it, your
              encrypted AI API key.
            </p>
            <p className="mt-3">
              We do not collect payment information, precise location data, or behavioral analytics.
            </p>
          </section>

          <section>
            <h2 className="text-foreground font-serif mb-3 text-xl font-semibold">
              How we use it
            </h2>
            <p>
              Your data powers the app: generating reports from your work log, personalizing the AI
              assistant with your career context, and displaying your activity history. We do not
              sell your data, use it for advertising, or share it with third parties outside of the
              services listed below.
            </p>
          </section>

          <section>
            <h2 className="text-foreground font-serif mb-3 text-xl font-semibold">
              Third-party services
            </h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-foreground">Google OAuth</strong> — handles authentication.
                Subject to Google&apos;s privacy policy.
              </li>
              <li>
                <strong className="text-foreground">Neon PostgreSQL</strong> — stores all
                application data on servers in the US-East region.
              </li>
              <li>
                <strong className="text-foreground">Google Gemini API</strong> — processes AI
                requests. Text you send to the AI (work entries, prompts) is transmitted to
                Google&apos;s API. By default, Jobmark uses a shared API key. If you provide your
                own key in Settings, requests are made under your account.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-foreground font-serif mb-3 text-xl font-semibold">
              Data retention and deletion
            </h2>
            <p>
              You can export your complete data history at any time from{' '}
              <Link href="/settings" className="text-primary hover:underline">
                Settings → Data
              </Link>
              . To delete your account and all associated data, use the &quot;Delete Account&quot;
              option in the same section. Deletion is immediate and irreversible.
            </p>
          </section>

          <section>
            <h2 className="text-foreground font-serif mb-3 text-xl font-semibold">Contact</h2>
            <p>
              For privacy questions, email{' '}
              <a href="mailto:hello@jobmark.app" className="text-primary hover:underline">
                hello@jobmark.app
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
