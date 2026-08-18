import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Jobmark',
  description: 'How Jobmark collects, uses, shares, and deletes personal information.',
};

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="text-muted-foreground mt-4 text-sm">
            Effective August 18, 2026 · Version 2026-08-18
          </p>
          <p className="text-muted-foreground mt-5 max-w-2xl leading-7">
            This policy explains what Jobmark handles when you use the service and the choices you
            have about it.
          </p>
        </header>

        <div className="text-muted-foreground space-y-10 text-sm leading-7">
          <section>
            <h2 className="text-foreground mb-3 font-serif text-xl font-semibold">1. Who we are</h2>
            <p>
              Jobmark is an Astatide project. In this policy, &quot;Jobmark,&quot; &quot;we,&quot;
              and &quot;us&quot; mean the person or business operating the service. For privacy
              questions or requests, email{' '}
              <a href="mailto:hello@jobmark.app" className="text-primary hover:underline">
                hello@jobmark.app
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 font-serif text-xl font-semibold">
              2. Information you provide
            </h2>
            <p>
              When you sign in with Google, we receive your name, email address, and profile photo
              made available for sign-in. We also process the authentication and session information
              needed to keep your account working.
            </p>
            <p className="mt-3">
              Depending on which features you use, Jobmark stores work notes and activities,
              projects, goals, review reports and drafts, professional contacts, interaction and
              outreach notes, focus or decompression entries, settings, and vault configuration.
              Some of that content may contain personal information about you or other people. Do
              not add information you do not have the right to use.
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 font-serif text-xl font-semibold">
              3. Information created by connections and requests
            </h2>
            <p>
              If you connect an assistant through MCP, Jobmark processes connection information such
              as the assistant&apos;s name, requested permissions, consent, connection status, and
              security token records. When you ask that assistant to use Jobmark, the request may
              include the notes, draft, project, contact, or other context needed for the task.
            </p>
            <p className="mt-3">
              Jobmark also receives basic technical information needed to deliver and protect the
              service, such as IP address, browser or device information, request timestamps, and
              error or security events, where available through the application and infrastructure.
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 font-serif text-xl font-semibold">
              4. How we use information
            </h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>To create and secure your account and keep you signed in.</li>
              <li>To store, organize, search, export, and delete the content you save.</li>
              <li>
                To calculate product statistics and create deterministic drafts from your records.
              </li>
              <li>To enable connections and requests that you authorize through MCP.</li>
              <li>To prevent abuse, troubleshoot failures, and maintain the service.</li>
              <li>To respond to support, privacy, and security requests.</li>
              <li>To meet legal obligations or protect the service and other people.</li>
            </ul>
            <p className="mt-3">
              Jobmark does not sell your personal information or use it for behavioral advertising.
              Jobmark does not operate its own general-purpose model service; connected assistant
              providers handle content sent to them under their own terms and policies.
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 font-serif text-xl font-semibold">
              5. Who receives information
            </h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-foreground">Google</strong> provides the sign-in service.
                Google&apos;s privacy policy also applies to Google&apos;s handling of information.
              </li>
              <li>
                <strong className="text-foreground">Neon PostgreSQL</strong> hosts Jobmark&apos;s
                application database.
              </li>
              <li>
                <strong className="text-foreground">Network and hosting providers</strong> may
                process requests and technical information while they help deliver and protect the
                service. Jobmark currently uses Cloudflare in its network path.
              </li>
              <li>
                <strong className="text-foreground">Connected assistants</strong> receive the
                content you authorize for a request. Each provider handles it under its own terms
                and privacy policy.
              </li>
              <li>
                <strong className="text-foreground">Legal or safety recipients</strong> may receive
                information when required by law or when reasonably necessary to prevent fraud,
                abuse, security harm, or harm to people.
              </li>
            </ul>
            <p className="mt-3">
              These providers may process information in the United States or other countries where
              they operate. We do not promise a particular country-level data residency unless we
              state it for a specific feature.
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 font-serif text-xl font-semibold">
              6. Cookies and similar storage
            </h2>
            <p>
              Jobmark uses necessary cookies and browser storage for authentication, session
              security, compliance acceptance, and temporary security flows such as vault access. We
              do not currently use behavioral analytics or advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 font-serif text-xl font-semibold">
              7. Retention, export, and deletion
            </h2>
            <p>
              We keep your account and saved content while your account is active. You can export
              the data Jobmark makes available from{' '}
              <Link href="/settings" className="text-primary hover:underline">
                Settings → Data
              </Link>
              . You can also delete your account there. Deleting an account removes its active
              application records and signs you out; it cannot be undone. Backups, security logs,
              and copies held by a connected assistant may remain for a limited period under the
              relevant provider&apos;s normal practices.
            </p>
            <p className="mt-3">
              Disconnecting an assistant stops future access through Jobmark. It does not control
              copies that assistant already received.
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 font-serif text-xl font-semibold">
              8. Your privacy choices
            </h2>
            <p>
              Depending on where you live, you may have rights to ask for access to, correction of,
              deletion of, or a copy of your personal information. You may also have rights to
              object to or restrict certain uses and to complain to a privacy regulator. You can use
              the in-product export and deletion controls or email{' '}
              <a href="mailto:hello@jobmark.app" className="text-primary hover:underline">
                hello@jobmark.app
              </a>{' '}
              for a request. We may ask for information needed to verify that the request belongs to
              you.
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 font-serif text-xl font-semibold">9. Security</h2>
            <p>
              We use technical and organizational measures intended to protect information, but no
              online service can promise absolute security. If you believe your account or data is
              at risk, contact us promptly at{' '}
              <a href="mailto:hello@jobmark.app" className="text-primary hover:underline">
                hello@jobmark.app
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 font-serif text-xl font-semibold">10. Children</h2>
            <p>
              Jobmark is not intended for children under 16. If you believe a child has provided
              personal information to Jobmark, contact us so we can review and remove it where
              appropriate.
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 font-serif text-xl font-semibold">
              11. Changes to this policy
            </h2>
            <p>
              We may update this policy as the service changes. We will update the effective date
              and, when a change is material, may ask signed-in users to review the new version.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
