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
          <p className="text-primary mb-3 text-xs font-semibold tracking-widest uppercase">Legal</p>
          <h1 className="text-foreground font-serif text-4xl leading-tight font-semibold">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground mt-4 text-sm">Last updated March 31, 2026</p>
        </header>

        <div className="text-muted-foreground space-y-10 text-sm leading-7">
          <section>
            <h2 className="text-foreground mb-3 font-serif text-xl font-semibold">
              What we collect
            </h2>
            <p>
              When you sign in with Google, we receive your name, email address, and profile photo
              from Google. Inside the app, we store the work entries, projects, goals, and reports
              you create. We also store your settings preferences and active connection records so
              you can see which AI apps have access.
            </p>
            <p className="mt-3">
              We do not collect payment information, precise location data, or behavioral analytics.
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 font-serif text-xl font-semibold">How we use it</h2>
            <p>
              Your data powers the app: building evidence-based briefs from your work log and
              contacts, and displaying your activity history. When you choose to open a brief in a
              connected AI app, that app receives the information needed for the task. We do not
              sell your data or use it for advertising.
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 font-serif text-xl font-semibold">
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
                <strong className="text-foreground">Connected AI apps</strong> — when you choose
                one, Jobmark hands the selected brief or prompt to that app. Each provider handles
                the content under its own terms and privacy policy.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-foreground mb-3 font-serif text-xl font-semibold">
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
            <h2 className="text-foreground mb-3 font-serif text-xl font-semibold">Contact</h2>
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
