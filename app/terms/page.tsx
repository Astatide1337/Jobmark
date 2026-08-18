import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | Jobmark',
  description: 'Plain-language terms for using Jobmark.',
};

export default function TermsPage() {
  return (
    <main className="bg-background min-h-screen">
      <article className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground mb-10 inline-flex text-sm transition-colors"
        >
          ← Jobmark
        </Link>

        <header className="mb-12">
          <p className="text-primary mb-3 text-xs font-semibold tracking-widest uppercase">Legal</p>
          <h1 className="text-foreground font-serif text-4xl leading-tight font-semibold">
            Terms of Service
          </h1>
          <p className="text-muted-foreground mt-4 text-sm">
            Effective August 18, 2026 · Version 2026-08-18
          </p>
          <p className="text-muted-foreground mt-5 max-w-2xl leading-7">
            These terms explain the basic rules for using Jobmark. They are written to be read by
            people, not just lawyers.
          </p>
        </header>

        <div className="text-muted-foreground space-y-10 text-sm leading-7">
          <section>
            <h2 className="text-foreground mb-3 font-serif text-xl font-semibold">
              1. Using Jobmark
            </h2>
            <p>
              Jobmark is an Astatide project. By creating an account or using the service, you agree
              to these Terms of Service. If you do not agree, do not create an account or use
              Jobmark. You must be at least 16 years old, or older if the law where you live
              requires a higher minimum age.
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 font-serif text-xl font-semibold">
              2. The service
            </h2>
            <p>
              Jobmark gives you a place to save work notes, organize projects and goals, manage
              professional contacts, and turn your own records into review or outreach drafts. It is
              a personal productivity tool. It is not HR, legal, financial, medical, or career
              advice, and it does not guarantee a professional outcome.
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 font-serif text-xl font-semibold">
              3. Your account
            </h2>
            <p>
              You sign in through an available authentication provider, currently Google. Keep your
              account information accurate and protect access to the account you use to sign in. You
              are responsible for activity that happens through your account.
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 font-serif text-xl font-semibold">
              4. Your content
            </h2>
            <p>
              You keep the rights to the notes, projects, contacts, drafts, and other content you
              add to Jobmark. You give Jobmark permission to store, process, display, back up, and
              transmit that content only as needed to provide, maintain, secure, and troubleshoot
              the service.
            </p>
            <p className="mt-3">
              Only add information you have the right to use. This matters especially for contact
              information, private workplace material, and anything that belongs to another person
              or organization.
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 font-serif text-xl font-semibold">
              5. Connected assistants
            </h2>
            <p>
              Jobmark can connect to an assistant you choose through MCP. When you authorize a
              connection or ask an assistant to use Jobmark, the selected assistant may receive the
              information needed for that request and may take actions allowed by the
              connection&apos;s permissions. Review the requested permissions and the result before
              sharing or acting on it.
            </p>
            <p className="mt-3">
              Connected assistants are separate services. Their providers control their own terms,
              privacy practices, storage, and model behavior. Disconnecting an assistant stops its
              future access through Jobmark; it does not necessarily remove content the provider
              already received.
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 font-serif text-xl font-semibold">
              6. Responsible use
            </h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>Follow the law and respect other people&apos;s rights.</li>
              <li>Do not attempt to access another person&apos;s account or data.</li>
              <li>
                Do not interfere with the service, bypass security, or probe it without permission.
              </li>
              <li>Do not use Jobmark to distribute malware, spam, or unlawful material.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-foreground mb-3 font-serif text-xl font-semibold">
              7. Drafts and suggestions
            </h2>
            <p>
              Jobmark may create drafts from information you save. Drafts and assistant responses
              are suggestions, not verified facts or professional advice. Check them before you
              send, publish, or rely on them at work.
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 font-serif text-xl font-semibold">
              8. Availability and changes
            </h2>
            <p>
              We work to keep Jobmark available, but we do not promise uninterrupted service,
              permanent storage, or that every feature will always be error-free. We may change,
              suspend, or retire features when needed to operate or improve the service.
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 font-serif text-xl font-semibold">
              9. Deletion and suspension
            </h2>
            <p>
              You may export or delete your account at any time from{' '}
              <Link href="/settings" className="text-primary hover:underline">
                Settings → Data
              </Link>
              . Account deletion removes your active Jobmark records and signs you out. It cannot be
              undone. We may suspend or end access if you seriously or repeatedly violate these
              terms, create a security risk, or use the service unlawfully.
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 font-serif text-xl font-semibold">
              10. Disclaimers and liability
            </h2>
            <p>
              Jobmark is provided &quot;as is.&quot; We make no guarantees of uptime, accuracy, or
              fitness for a specific purpose. To the maximum extent permitted by law, Jobmark is not
              liable for indirect, incidental, special, consequential, or lost-profit damages
              arising from your use of the service. Nothing in these terms limits rights or remedies
              that the law does not allow us to limit.
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 font-serif text-xl font-semibold">
              11. Changes to these terms
            </h2>
            <p>
              If we make a material change, we will update the effective date and may ask you to
              review and accept the new version before you continue using protected parts of the
              service. Your continued use after an update means you accept the updated terms to the
              extent allowed by law.
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 font-serif text-xl font-semibold">12. Contact</h2>
            <p>
              Questions about these terms can be sent to{' '}
              <a href="mailto:hello@jobmark.app" className="text-primary hover:underline">
                hello@jobmark.app
              </a>
              .
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
