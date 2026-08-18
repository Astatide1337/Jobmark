# Jobmark legal-readiness notes

Status: implementation foundation only. Jobmark must not describe itself as legally compliant or open public signup until the current Terms, Privacy Policy, age/eligibility approach, and operational controls have been reviewed and approved by qualified counsel.

## Decisions recorded

- **Operator:** Jobmark is operated by an individual operator under the Astatide name. The final public legal documents must identify the correct legal person, business address, governing law, and service-of-process details.
- **Audience:** Jobmark is intended for global users aged 16 and older, subject to applicable local law and any country-specific restrictions counsel identifies.
- **Contacts:** Astatide owns the support, privacy, and security contact channels. The canonical public addresses and response/incident process still need to be confirmed and published consistently in the legal pages, account flows, and operational runbooks.
- **Analytics:** Jobmark does not use behavioral analytics. This decision must remain true in production configuration, telemetry, vendor configuration, and future product work.
- **Public signup:** Counsel review is required before public signup is enabled.

## Implementation in this release

The compliance onboarding foundation is intentionally separate from authentication and existing routes:

- `UserCompliance.age16ConfirmedAt` stores the server timestamp for the user’s explicit confirmation that they are at least 16. No birth date is collected or stored.
- `ComplianceAcceptance` stores append-only Terms and Privacy acceptance records, each keyed by document type and version and timestamped by the server.
- `lib/compliance-policy.ts` is the single source of the currently displayed document versions and the minimum-age policy.
- `app/actions/compliance.ts` validates explicit confirmations server-side and derives the user from the authenticated session.
- `app/onboarding` provides a standalone authenticated surface that can be used as the post-sign-in compliance step or embedded into a future onboarding flow.

The current application document versions are provisional release identifiers (`2026-03-31`) matching the existing legal-page update dates. If counsel changes either document, update the policy constant and publish the corresponding document before accepting the new version.

## Required before public signup

1. Have counsel review and approve the Terms, Privacy Policy, global availability/age approach, consent language, retention/deletion commitments, connected-assistant disclosures, and jurisdiction-specific requirements.
2. Confirm the individual operator’s legal identity and Astatide support, privacy, and security contact addresses.
3. Define the process for privacy requests, account deletion, security reports, complaints, and requests involving users under local age thresholds.
4. Confirm vendor locations, subprocessors, international transfer language, and retention/deletion behavior against production configuration.
5. Integrate the onboarding check into the authenticated entry flow. Users should be sent to `/onboarding` until `readCurrentCompliance()` reports `isComplete: true` for the current document versions.
6. Keep behavioral analytics disabled and verify that logs do not capture onboarding checkbox contents beyond the compliance timestamps and document versions required for the acceptance record.

This checklist is a release gate, not a legal opinion or a certification of compliance.
