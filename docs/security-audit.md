# Security audit notes

This document records the dependency and application-security checks performed for issue #2.

## Application controls

- Server actions derive the authenticated user from the server session; caller-provided user IDs are not trusted for account-scoped reads or writes.
- Project activity, conversations, reports, goals, contacts, and outreach records are checked against the authenticated account before they are linked.
- Vault unlock cookies are encrypted, user-bound, expire after 24 hours, and are invalidated when the vault password changes. Unlock attempts are rate-limited in-process.
- Account exports use an explicit field allowlist and require vault unlock when locked records are included.
- Review briefs and outreach plans are generated from bounded, authenticated record data without an external model service. When a user chooses an MCP assistant, only the selected brief or task context is handed to that assistant.

## Dependency check

The production dependency audit was run with:

```text
npm audit --omit=dev
```

The current result has no high or critical production findings. Three moderate advisories remain transitively through the framework/document parsing toolchain (js-yaml, postcss/Next.js). They are retained as an accepted residual risk because the affected packages do not currently have a compatible zero-advisory resolution for this application; the direct high/critical findings were removed through the dependency upgrades and overrides in `package.json`.

Re-run the audit after dependency updates and review this note if the result changes.
