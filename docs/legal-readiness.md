# Jobmark legal-readiness notes

Status: self-authored release draft. These notes and the public Terms and Privacy Policy are not
legal advice, a legal opinion, or a certification of compliance. They document the product
decisions and technical controls we currently intend to keep true.

## Decisions recorded

- **Operator:** Jobmark is an Astatide project. The public contact for terms, privacy, and security questions is `hello@jobmark.app`. We do not publish a made-up legal entity, address, or governing-law statement.
- **Audience:** Jobmark is intended for global users aged 16 and older, subject to applicable local law and any country-specific restrictions.
- **Contacts:** The public privacy and security contact is `hello@jobmark.app` until a separate address is published.
- **Analytics:** Jobmark does not use behavioral analytics. This decision must remain true in production configuration, telemetry, vendor configuration, and future product work.
- **Public signup:** The product owner decides when to open signup. The policy text must remain accurate, the deletion/export controls must work, and applicable jurisdiction-specific obligations still apply regardless of whether counsel is retained.

## Implementation in this release

The compliance onboarding foundation is intentionally separate from authentication and existing routes:

- `UserCompliance.age16ConfirmedAt` stores the server timestamp for the user’s explicit confirmation that they are at least 16. No birth date is collected or stored.
- `ComplianceAcceptance` stores append-only Terms and Privacy acceptance records, each keyed by document type and version and timestamped by the server.
- `lib/compliance-policy.ts` is the single source of the currently displayed document versions and the minimum-age policy.
- `app/actions/compliance.ts` validates explicit confirmations server-side and derives the user from the authenticated session.
- `app/onboarding` provides a standalone authenticated surface that can be used as the post-sign-in compliance step or embedded into a future onboarding flow.

The current application document versions are `2026-08-18`, matching the effective dates shown on the public legal pages. If either document changes, update the policy constant and publish the corresponding document before accepting the new version.

## Required before public signup

1. Keep the public Terms and Privacy Policy synchronized with the product, vendors, MCP behavior, cookies, and deletion/export controls.
2. Define the process for privacy requests, account deletion, security reports, complaints, and requests involving users under local age thresholds.
3. Confirm vendor locations, subprocessors, international transfer language, and retention/deletion behavior against production configuration.
4. Integrate the onboarding check into the authenticated entry flow. Users should be sent to `/onboarding` until `readCurrentCompliance()` reports `isComplete: true` for the current document versions.
5. Keep behavioral analytics disabled and verify that logs do not capture onboarding checkbox contents beyond the compliance timestamps and document versions required for the acceptance record.
6. Recheck the documents whenever Jobmark adds payments, advertising, analytics, additional Google scopes, model services, or a new category of personal data.

This checklist is a product and engineering release gate, not a legal opinion or a certification of compliance.
