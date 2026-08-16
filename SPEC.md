jobmark-mcp-refactor-spec.md

# Jobmark MCP Refactor Specification

**Status:** Implementation-ready product and engineering specification  
**Decision date:** 2026-07-20  
**Repository:** `Astatide1337/Jobmark`  
**Delivery model:** One coordinated refactor PR, implemented in ordered internal stages  
**Canonical route:** `https://jobmark.astatide.com/mcp`

## 1. Executive decision

Jobmark no longer operates its own general-purpose AI chat product. The Connect AI page at `/settings/connections` helps a user connect Jobmark to ChatGPT, Claude, or another remote MCP client.

The external MCP client owns:

- The conversation and conversation history.
- Model selection and model billing.
- Streaming responses, attachments, multimodal input, and agent behavior.
- User-facing tool approvals and conversation UX.

Jobmark owns:

- The user's career data and application rules.
- Authentication and authorization.
- Tenant isolation and vault visibility.
- Input validation, date semantics, and database transactions.
- A remote MCP server exposing the capabilities of the remaining Jobmark application.

The refactor has two inseparable outcomes:

1. Remove the active Jobmark chat runtime and provide the **Add MCP** connection experience at `/settings/connections`.
2. Expose every remaining user-facing Jobmark capability through the MCP server, backed by the same domain functions used by the web application.

This is **capability parity**, not a one-to-one copy of every current Server Action signature. MCP tools may consolidate UI-specific helpers when the resulting tool still provides the complete capability.

## 2. Product boundaries

### 2.1 Goals

- A user can use Jobmark from any compatible remote MCP client without relying on Jobmark's own chat interface.
- Every remaining web capability has an MCP equivalent with the same ownership, vault, validation, date, and persistence rules.
- Web actions and MCP tools do not duplicate business logic.
- The connection page is simple, attractive, responsive, and honest about what each client currently supports.
- Legacy internal chat data is removed through an explicit database migration; current contact history remains in `InteractionLog`.
- The MCP server runs efficiently on the current Next.js/Vercel deployment without Redis, sticky sessions, or an always-on worker.
- Authentication follows the remote MCP authorization specification and works with major hosted clients.
- Destructive and secret-bearing operations remain possible without exposing passwords or other secrets to the language model.

### 2.2 Non-goals

- Do not build another chat UI, chat sidebar, conversation store, or model selector.
- Do not build MCP Apps or client-specific embedded widgets in this refactor.
- Do not add prompts, sampling, background agents, tasks, subscriptions, or server-initiated model calls to the MCP protocol surface.
- Do not add embeddings, vector search, or a new search engine.
- Do not introduce a REST API solely as an intermediate layer.
- Do not build a generic repository abstraction over Prisma.
- Do not create a plugin framework or a reflective “operation platform.”
- Do not migrate away from Auth.js as part of this refactor.
- Do not remove report generation, outreach generation, report editing, outreach editing, or dictation polishing. These are discrete existing Jobmark utilities, not the general chat product. Their future removal is a separate product decision.
- Do not confuse legacy internal chat records with Network contact conversations, which remain supported.
- Do not promise literal one-click installation when a client has no supported installation deep link.

## 3. Current codebase assessment

Jobmark currently mixes transport/UI concerns and domain behavior inside Server Actions. Authentication, Zod validation, Prisma access, vault filtering, date conversion, UI-oriented return values, and `revalidatePath` are frequently in the same function. The MCP refactor must extract reusable domain functions while preserving existing web behavior.

### 3.1 Existing domains that remain

| Domain        | Current implementation        | Required MCP coverage                                                               |
| ------------- | ----------------------------- | ----------------------------------------------------------------------------------- |
| Activities    | `app/actions/activities.ts`   | List, create, delete, counts, dashboard statistics                                  |
| Projects      | `app/actions/projects.ts`     | List, read details, create, update, archive, restore, list project activities       |
| Goals         | `app/actions/goals.ts`        | List, create, update, delete                                                        |
| Reports       | `app/actions/reports.ts`      | Count eligible activities, generate, improve text, save, list, read, update, delete |
| Search        | `app/actions/search.ts`       | Search activities, projects, reports, contacts, and interactions                    |
| Insights      | `app/actions/insights.ts`     | Activity totals, streaks, heatmap/trend data, project distribution, report totals   |
| Contacts      | `app/actions/network.ts`      | List, read, create, update, delete                                                  |
| Interactions  | `app/actions/network.ts`      | List, create, update, delete, follow-up/network statistics                          |
| Outreach      | `app/actions/network-ai.ts`   | Generate, save, list, update, delete, improve                                       |
| Focus         | `app/actions/focus-config.ts` | Read, save, reset focus configuration                                               |
| Decompression | `app/actions/decompress.ts`   | Log decompression session                                                           |
| Dictation     | `app/actions/dictation.ts`    | Polish dictated text                                                                |
| Settings      | `app/actions/settings.ts`     | Read and update user-facing settings                                                |
| Vault         | `app/actions/project-lock.ts` | Status, setup/change/unlock/lock, list locked projects, move projects in/out        |
| Account data  | `app/actions/settings.ts`     | Export, clear activities, and delete account in Settings → Data                     |

### 3.2 Retired chat subsystem

The active runtime and UI under the following areas must be removed or replaced:

- The former internal chat route tree is removed; Connect AI lives at `/settings/connections`.
- Former chat UI components, actions, API endpoints, and support libraries are removed.
- Chat-only tests and chat-only rate-limit call sites.

The repository must also be searched for product language and demos that imply Jobmark provides an internal AI mentor or chat experience, including:

- Landing-page demos and product-tour content.
- FAQ, pricing, persona, CTA, and marketing text.
- README and documentation.
- Privacy and terms pages.
- Open Graph/metadata text.
- Navigation labels and command/search menus.

### 3.3 Legacy chat data

The legacy `Conversation`, `Message`, `ChatRequest`, and
`_ConversationToReport` tables are removed by the cleanup migration. They are
separate from the current `InteractionLog` records used for contact history.

## 4. User experience and visual design

### 4.1 Navigation

Use `/settings/connections` as the assistant connection route and **Connect AI** as its navigation label.

Do not use **MCP** as the only navigation label because many users will not know the protocol name. MCP can remain the technical CTA and explanatory term on the page.

### 4.2 Page layout

The `/settings/connections` page should use the existing Jobmark shell and design language. The main content area contains one centered connection card.

Recommended structure:

```text
Connect Jobmark to your assistant
Use your Jobmark data from the assistant you already prefer.

┌──────────────────────────────────────────────────────────┐
│                         [icon]                           │
│                         Add MCP                          │
│                                                          │
│ Connect Jobmark to ChatGPT, Claude, or another          │
│ MCP-compatible client. Your assistant can search,       │
│ create, and manage your Jobmark data.                    │
│                                                          │
│ [ Set up ChatGPT ] [ Set up Claude ]                     │
│ [ Use another client ]                                   │
│                                                          │
│ Jobmark receives only the tool requests your client      │
│ sends—not your entire conversation.                      │
└──────────────────────────────────────────────────────────┘

1 connected client · Manage
```

### 4.3 Visual requirements

- Center the card vertically within the usable application viewport, not the full browser viewport behind the app header.
- Use a maximum width around `36rem–42rem`; do not make the card span the dashboard.
- Match existing radius, border, surface, type scale, and spacing tokens.
- Avoid gradient-heavy “AI” styling, animated glows, chat bubbles, fake message previews, or a second product aesthetic.
- Use one restrained connection/server icon from the existing icon library.
- Provider buttons may use approved local monochrome logos or plain text. Do not hotlink remote brand assets.
- On narrow screens, stack all buttons and keep a minimum touch target of 44px.
- Preserve visible keyboard focus and logical tab order.
- Provide light and dark/theme-preset coverage.
- Respect reduced motion; no motion is required for the primary experience.

### 4.4 Connection page states

#### Disconnected

Show the Add MCP card and all provider options.

#### One or more connections

Keep the same card and setup buttons. Add a subdued line below the card such as:

```text
2 connected clients · Manage
```

Do not replace the setup experience with a complex dashboard.

#### Manage connections

Use a small dialog, sheet, or Settings section listing:

- Client name.
- Connected date.
- Last-used date.
- Status.
- Revoke action.

The revoke action must invalidate refresh/access tokens and any MCP vault lease.

#### Error/unsupported state

Setup dialogs must explain plan or workspace restrictions without blaming Jobmark. Provide a copyable endpoint and manual steps even when the client cannot be opened automatically.

### 4.5 “Quick add” behavior

Current major clients require the user to create or add a custom connector/app by entering the remote MCP URL. There is no dependable, documented universal installation deep link.

Therefore, **quick add means guided setup**, not a false one-click claim.

Each provider button should:

1. Copy `https://jobmark.astatide.com/mcp` where browser clipboard permission is available.
2. Open a focused setup dialog with the current platform steps.
3. Provide an **Open ChatGPT** or **Open Claude** button to the client home/settings surface.
4. Keep a visible **Copy MCP URL** fallback.

Provider-specific URLs and wording must be stored in one configuration module so they can be updated without changing the connection component.

### 4.6 ChatGPT setup copy

The ChatGPT dialog should state:

- Open ChatGPT Settings → Apps and create a custom app/MCP connection.
- Enter the Jobmark MCP endpoint.
- Choose OAuth when prompted.
- Complete Jobmark authorization and tool scanning.
- Custom MCP and write-action availability depends on the user's plan and workspace permissions.

Do not claim that every ChatGPT plan can use every Jobmark write or destructive tool.

### 4.7 Claude setup copy

The Claude dialog should state:

- Open Customize → Connectors.
- Choose Add custom connector.
- Enter the Jobmark MCP endpoint.
- Complete the Jobmark authorization flow.
- Enable the connector/tools for the relevant conversation.

### 4.8 Other-client setup

Show:

- Name: `Jobmark`
- URL: `https://jobmark.astatide.com/mcp`
- Transport: `Streamable HTTP`
- Authentication: `OAuth 2.1`

Include a generic configuration example only when the selected client supports JSON configuration. Do not imply that a local `stdio` configuration is required.

## 5. External-client ownership and privacy

The page and privacy policy must be explicit:

- Jobmark does not receive the user's entire external-client conversation by default.
- Jobmark receives the tool name, arguments, and protocol metadata the client sends to the MCP server.
- Tool arguments can contain sensitive Jobmark data or user instructions and must be handled as private account data.
- Jobmark returns user-authorized data to the external MCP client, whose own terms and data controls then apply.
- Jobmark must not log full tool arguments, report bodies, notes, contact details, passwords, credentials, or full tool results in production logs.
- Structured logs may contain request ID, connection ID, tool name, duration, result status, and a non-sensitive error code.

## 6. Technical architecture

### 6.1 Request flow

```text
Jobmark web UI
    → Server Action adapter
        → Shared Jobmark domain function
            → Prisma/PostgreSQL

External MCP client
    → /mcp Streamable HTTP route
        → OAuth token validation
            → MCP tool adapter
                → Shared Jobmark domain function
                    → Prisma/PostgreSQL
```

### 6.2 Shared domain functions

Create ordinary, typed server-only modules. Do not create a generic operation framework.

Recommended structure:

```text
lib/jobmark/
  actor.ts
  errors.ts
  activities.ts
  projects.ts
  goals.ts
  reports.ts
  search.ts
  insights.ts
  contacts.ts
  interactions.ts
  outreach.ts
  focus.ts
  settings.ts
  vault.ts
  account.ts

lib/mcp/
  server.ts
  auth.ts
  context.ts
  errors.ts
  results.ts
  pagination.ts
  tools/
    activities.ts
    projects.ts
    goals.ts
    reports.ts
    search.ts
    insights.ts
    network.ts
    outreach.ts
    focus.ts
    settings.ts
    vault.ts
    account.ts
```

Each domain function receives a trusted actor created by the transport adapter:

```ts
type JobmarkActor = {
  userId: string;
  source: 'web' | 'mcp';
  connectionId?: string;
  vaultUnlocked: boolean;
  requestId: string;
};
```

Rules:

- No public function accepts a caller-supplied `userId` as ordinary input.
- Ownership filters must be inside the domain function, not only the adapters.
- Zod schemas used by MCP and web adapters should derive from the same canonical input schemas.
- UI cache revalidation stays in Server Actions, not in domain modules.
- Domain functions return stable DTOs with strings for dates/timestamps; they do not return raw Prisma entities when fields are private or transport-specific.
- Domain functions throw typed domain errors. Adapters map them to UI state or MCP tool errors.

### 6.3 MCP implementation

Use a production-stable release of Vercel's `mcp-handler`/MCP Adapter with the production-stable MCP TypeScript SDK generation available at implementation time. Do not build production behavior against a pre-alpha SDK branch.

Deployment requirements:

- Remote Streamable HTTP at `/mcp`.
- Stateless request handling.
- No Redis, sticky sessions, or legacy SSE endpoint.
- No MCP session state unless a verified client requires it.
- JSON/normal Streamable HTTP responses for ordinary tool calls.
- Node.js runtime on Vercel.
- `GET`, `POST`, and `OPTIONS` handling as required by the adapter/protocol.
- `Cache-Control: no-store` on authenticated protocol responses.
- Validate the `Origin` header whenever present; reject unknown origins with 403.
- Expose the authorization and protocol headers required by browser-based inspectors/clients.
- Enforce `MCP-Protocol-Version` negotiation through the adapter.

### 6.4 Protocol scope

Initial server capabilities:

- `tools`

Intentionally omit:

- Prompts.
- Resources, except a resource link returned by an export/secure-action tool when useful.
- Sampling.
- Elicitation.
- Tasks.
- Resource subscriptions.
- Server-initiated notifications beyond what the adapter requires.

This keeps cross-client behavior predictable.

## 7. Authentication and authorization

### 7.1 Requirements

Remote hosted clients require a standards-compatible authorization flow. Static bearer tokens are not the primary production connection path.

The implementation must support:

- OAuth 2.1 authorization code flow.
- PKCE using `S256`.
- OAuth Protected Resource Metadata.
- Authorization Server Metadata and/or OIDC discovery.
- Dynamic Client Registration for clients that use it.
- Exact redirect URI validation.
- Refresh tokens and token revocation.
- Resource/audience binding to the Jobmark MCP server.
- Short-lived access tokens.
- Refresh-token rotation or equivalent replay protection.
- 401 responses with correct discovery metadata.
- 403 responses for insufficient scope.
- No token passthrough.

### 7.2 Preserve Auth.js

Auth.js remains the website authentication system. The OAuth authorization/consent screen uses the existing Auth.js session to identify the signed-in Jobmark user.

Do not migrate the website to a different authentication library merely to add MCP.

The OAuth server must be implemented with a maintained authorization-server library and a persistent Prisma-backed adapter. Do not hand-write cryptography, JWT signing, PKCE verification, DCR validation, or refresh-token rotation from ad hoc helpers.

The first implementation stage must prove on a Vercel preview that the selected OAuth library:

- Works in the Vercel Node runtime.
- Persists all required state in PostgreSQL rather than process memory.
- Can use an Auth.js-authenticated interaction/consent page.
- Completes authorization and refresh with MCP Inspector and Claude.

If the selected library cannot satisfy these constraints, stop and document the blocker instead of silently replacing Auth.js or implementing an unsafe custom provider.

### 7.3 Fixed scopes

Use a small fixed scope model:

- `jobmark:read`
- `jobmark:write`
- `jobmark:destructive`
- `offline_access` for refresh tokens

There is no user-facing scope builder.

The normal connection flow requests read and write access. Destructive tools either require the destructive scope at connection time or trigger a standards-compliant insufficient-scope challenge. The chosen behavior must be consistent across clients.

### 7.4 Connection records

Persist a user-facing MCP connection record even if the OAuth library has its own token tables:

```text
McpConnection
- id
- userId
- oauthClientId
- clientName
- createdAt
- lastUsedAt
- revokedAt
- vaultUnlockedUntil
```

This powers connection management and token-scoped vault state.

Revocation must invalidate:

- Access tokens.
- Refresh tokens.
- Consent/grant state where applicable.
- Vault unlock state.

## 8. Vault and secret-bearing actions

Passwords and other secrets must never be passed as ordinary MCP tool arguments because the external model/client may retain tool inputs in conversation or telemetry.

### 8.1 Secure action links

The following MCP capabilities initiate a short-lived, user-bound Jobmark browser flow:

- Set vault password.
- Change vault password.
- Unlock vault.
- Confirm account deletion.

The tool returns:

```json
{
  "status": "user_action_required",
  "actionUrl": "https://jobmark.astatide.com/...",
  "expiresAt": "...",
  "message": "Open Jobmark to complete this secure action."
}
```

The URL contains a one-time opaque nonce stored hashed in the database. It must:

- Expire quickly.
- Be bound to the user and MCP connection.
- Be single-use.
- Require an active Auth.js website session or redirect to sign-in.
- Never contain the secret value.

After successful vault unlock, set `vaultUnlockedUntil` on that MCP connection. A web vault cookie does not automatically unlock an MCP connection, and an MCP unlock does not unlock every browser/device.

### 8.2 Vault visibility

Every shared read/write function must use the actor's vault state:

- Locked projects and their activities/reports are absent when the actor is locked.
- The server must not leak locked-project IDs, names, counts, report metadata, search matches, or relationship links.
- Moving a project out of the vault requires an active MCP vault lease.
- `vault_lock` clears the lease immediately.

## 9. MCP tool contract

Tool names are a compatibility contract because clients may cache or snapshot tool definitions. Names and required parameters must remain stable after release; compatible additions should be optional.

Use lower-case snake-case names. Each tool must provide:

- A concise human-readable title.
- A precise description that states side effects.
- Zod/JSON input schema with `additionalProperties: false` where supported.
- Output schema.
- `structuredContent` plus a short text fallback.
- Correct `readOnlyHint`, `destructiveHint`, `idempotentHint`, and `openWorldHint` annotations.
- Bounded result sizes.
- Stable error codes.

### 9.1 Tool inventory

#### Activities

- `activities_list`
- `activities_create`
- `activities_delete`
- `activities_stats`

`activities_list` includes total/next-cursor metadata, replacing separate count-only reads where appropriate.

#### Projects

- `projects_list`
- `projects_get`
- `projects_create`
- `projects_update`
- `projects_set_archived`

`projects_get` can include a bounded page of project activities. This covers the existing detail and project-activity reads.

#### Goals

- `goals_list`
- `goals_create`
- `goals_update`
- `goals_delete`

#### Reports

- `reports_list`
- `reports_get`
- `reports_check_activity_count`
- `reports_generate`
- `reports_create`
- `reports_update`
- `reports_delete`
- `reports_improve_text`

`reports_list` returns metadata and a content preview, not every full report body. `reports_get` returns the complete selected report.

#### Search and insights

- `search_global`
- `dashboard_stats`
- `insights_get`

`insights_get` accepts options to include or omit large heatmap/grid arrays. Summary data is returned by default; full parity data is available when requested.

#### Contacts

- `contacts_list`
- `contacts_get`
- `contacts_create`
- `contacts_update`
- `contacts_delete`

#### Interactions

- `interactions_list`
- `interactions_create`
- `interactions_update`
- `interactions_delete`
- `network_stats`

#### Outreach

- `outreach_list`
- `outreach_generate`
- `outreach_create`
- `outreach_update`
- `outreach_delete`
- `outreach_improve_text`

#### Focus and writing

- `focus_get`
- `focus_save`
- `focus_reset`
- `focus_log_decompression`
- `dictation_polish`

#### Settings

- `settings_get`
- `settings_update`

`settings_update` accepts explicit sections for goals, reports, appearance, preferences, and timezone. It must not accept arbitrary object spreading into Prisma.

#### Vault

- `vault_status`
- `vault_list_projects`
- `vault_begin_setup`
- `vault_begin_change_password`
- `vault_begin_unlock`
- `vault_lock`
- `vault_set_project_locked`

#### Account data

- `account_clear_activities`

Account export and account deletion stay in Settings → Data so the user can review the
action in Jobmark itself. MCP exposes only the explicitly confirmed activity-clearing action.

### 9.2 Date and identifier rules

- Calendar dates use `YYYY-MM-DD` strings.
- Timestamps use ISO 8601 strings with offsets/UTC.
- Do not accept JavaScript `Date` objects at the tool boundary.
- The server applies the user's Jobmark timezone where an input date is omitted.
- Return stable entity IDs in all list/search results.
- Mutations use IDs, not fuzzy names, unless an explicitly documented resolver returns an ambiguity error.

### 9.3 Pagination and size limits

List/search tools use a server-defined opaque cursor and bounded `limit`.

Suggested hard maxima:

- Activities: 50 per call.
- Search: 20 results.
- Projects/goals: 100.
- Contacts: 50.
- Interactions: 50.
- Reports/outreach drafts: 25 metadata rows.

Full bodies are fetched by ID. No list tool may return an unbounded user's entire history.

### 9.4 Errors

Protocol-level errors are reserved for malformed JSON-RPC or unknown tools. Validation and business failures return MCP tool execution errors with a stable code:

- `UNAUTHENTICATED`
- `INSUFFICIENT_SCOPE`
- `FORBIDDEN`
- `VALIDATION_ERROR`
- `NOT_FOUND`
- `VAULT_LOCKED`
- `USER_ACTION_REQUIRED`
- `CONFIRMATION_REQUIRED`
- `CONFLICT`
- `RATE_LIMITED`
- `INTERNAL_ERROR`

Error text must be actionable for the model but must not reveal stack traces, SQL, secret values, or whether another tenant owns a guessed ID.

### 9.5 Idempotency

MCP clients and network layers may retry requests. Prevent duplicate creates by storing a short-lived idempotency record keyed by connection, tool, and protocol request ID/idempotency key.

```text
McpIdempotency
- id
- connectionId
- toolName
- requestKey
- status
- resultJson
- createdAt
- expiresAt
```

Requirements:

- Unique `(connectionId, toolName, requestKey)`.
- Only one caller performs the mutation.
- Replays return the original result.
- Failed records may be retried according to an explicit status transition.
- Do not retain sensitive full results longer than necessary.

## 10. Web-adapter refactor

Each current Server Action should become a thin adapter:

1. Authenticate with Auth.js.
2. Convert `FormData` or component input into the canonical Zod input.
3. Build the web actor, including browser vault state.
4. Call the shared domain function.
5. Revalidate affected paths.
6. Convert domain results/errors to the current UI return type.

Existing UI behavior must remain unchanged except for the explicit chat-to-MCP product changes.

A shared domain function must never call `revalidatePath`, read browser cookies directly, or return a `FormState` type.

## 11. Chat removal and product-content updates

### 11.1 Runtime removal

- Remove internal chat streaming and cancellation endpoints.
- Remove chat request lifecycle code and the `ChatRequest` persistence model.
- Remove conversation creation, rename, context-linking, and deletion UI/actions.
- Remove chat-specific system prompts and context providers.
- Remove chat-specific client state, suggested prompts, message rendering, and composer code.
- Remove chat-only tests after equivalent MCP coverage exists.
- Remove unused dependencies only after confirming they are not required by reports/outreach/dictation.

### 11.2 Route behavior

- There is no internal chat route or redirect. Connect AI is served at `/settings/connections`.
- Former internal chat API paths return 404/410; no compatibility proxy is required.

### 11.3 Marketing and documentation

Update all copy that describes Jobmark as providing an internal AI coach or chat. The new product framing is:

> Jobmark is a private career operating system that connects to the AI assistant the user already chooses through MCP.

Update at minimum:

- README.
- Landing product tour and chat demo.
- FAQ.
- Privacy policy.
- Terms.
- Settings review descriptions.
- Open Graph metadata.
- Security documentation.
- Deployment/environment documentation.

### 11.4 Deterministic briefs and assistant handoffs

Keep report generation, outreach generation, report/outreach improvement, and dictation polishing operational.

Clarify in UI and documentation that:

- Jobmark builds bounded, evidence-only briefs and predictable text cleanups from the user's record.
- No external model service is required for the first draft.
- A connected MCP assistant can read the underlying data, perform richer writing, and save the result through Jobmark tools.

## 12. Database and migrations

The implementation PR will include committed Prisma migrations for:

- OAuth authorization-server storage required by the selected library.
- `McpConnection`.
- `McpIdempotency`.
- Short-lived secure-action nonce storage if not provided by the OAuth implementation.
- A cleanup migration drops the obsolete `Conversation`, `Message`, `ChatRequest`, and `_ConversationToReport` tables.

Do not edit or remove historical migration files.

Add indexes for:

- Active connection lookup by user/client.
- Access/refresh token lookup and expiration.
- Idempotency unique key and expiration cleanup.
- Secure-action nonce lookup and expiration.

All token/code/nonce values stored in the database must be hashed or encrypted according to their use. Raw bearer credentials must never be stored in logs.

## 13. Rate limiting and operational safety

Reuse the existing database-backed `RateLimitBucket` mechanism rather than adding Redis.

Apply separate limits by user/connection and tool class:

- Read/list/search.
- Ordinary writes.
- Brief-generation and assistant-handoff operations.
- Secret/authorization attempts.
- Destructive operations.

The exact limits should be constants with tests. Rate-limit responses must include a retryable error and avoid leaking tenant information.

Brief-generation operations remain bounded and use the shared request limit. Assistant failures are handled by the external client rather than a Jobmark model service.

## 14. Deployment and production migration process

This refactor introduces authentication and schema changes; it must not repeat the prior pattern where application code was promoted before production migrations were confirmed.

Required release behavior:

1. CI passes against a fresh PostgreSQL database using all committed migrations.
2. Production database backup/recovery point is confirmed.
3. `prisma migrate deploy` runs against production before the deployment that removes the internal chat runtime receives production traffic.
4. Deploy the exact reviewed commit to Vercel.
5. Verify OAuth metadata and unauthorized MCP responses.
6. Complete a real OAuth connection.
7. Invoke representative read/write/destructive-safe tools.
8. Verify `/settings/connections` and confirm the removed internal chat path has no application route.
9. Verify no recent production runtime errors.

Prefer a controlled GitHub Actions production-release job that applies migrations and deploys/promotes the reviewed Vercel build. Do not rely on a developer laptop as the normal release mechanism.

Preview deployments must not apply migrations to the production database.

## 15. Testing plan

### 15.1 Domain tests

For every shared domain module:

- Valid behavior.
- Runtime validation.
- Ownership/tenant isolation.
- Locked-project behavior.
- Date/timezone behavior.
- Not-found behavior without cross-tenant leakage.
- Transactional behavior for multi-write operations.

### 15.2 Adapter parity tests

For representative operations in each domain, execute through both adapters and verify equivalent database state and domain result:

```text
Web adapter → shared function → database
MCP adapter → shared function → database
```

The adapters may format responses differently, but authorization and effects must match.

### 15.3 MCP contract tests

- Initialization and protocol-version negotiation.
- `tools/list` succeeds after authentication.
- Tool names and input/output schemas match committed snapshots.
- Every inventory item in this spec is registered.
- No retired chat tool is registered.
- Structured outputs validate against output schemas.
- Validation errors use tool execution errors.
- Read/write/destructive annotations are correct.
- Pagination and hard limits.
- Idempotency under concurrent/retried writes.
- Cancellation/timeouts do not commit partial mutations.

### 15.4 OAuth/security tests

- Protected Resource Metadata discovery.
- Authorization Server/OIDC discovery.
- PKCE S256 required.
- Invalid redirect URI rejected.
- Expired/invalid/revoked token rejected.
- Wrong audience/resource rejected.
- Refresh token rotation/replay behavior.
- Revoking a connection invalidates access.
- Unknown/invalid Origin rejected when Origin is present.
- Rate limiting for authorization/vault attempts.
- No secret values in logs or tool responses.

### 15.5 Tenant and vault end-to-end QA

Use two real test users:

- User A cannot list/read/update/delete User B entities through any tool group.
- Guessed IDs return safe not-found/forbidden behavior.
- Locked projects and related data are invisible while the MCP connection is locked.
- Browser unlock does not implicitly unlock MCP.
- MCP unlock expires and is connection-specific.
- Revocation clears the vault lease.

### 15.6 Client compatibility

Required:

- MCP Inspector full connection and representative tool calls.
- Claude remote custom connector: OAuth, tool scan, read, create, update, delete confirmation.
- ChatGPT custom app/connector where the available account/workspace supports it: OAuth, tool scan, read and write. If the available plan cannot exercise write actions, document the exact limitation and still verify discovery/read behavior.
- One generic client such as Cursor, VS Code, or Claude Code connecting to the Streamable HTTP URL.

### 15.7 UI QA

Evidence for:

- `/settings/connections` desktop and mobile.
- At least light and dark modes; verify all supported theme presets do not break contrast/layout.
- Keyboard navigation and visible focus.
- Copy URL success/failure.
- ChatGPT, Claude, and Other setup dialogs.
- Connected-client state and revoke flow.
- Contact conversation history remains available through the Network area.

## 16. Evidence required on the pull request

The PR is not merge-ready without:

- Full CI link and exact head SHA.
- Migration output from a clean database.
- Tool inventory JSON or MCP Inspector screenshot showing all registered tools.
- OAuth metadata output with secrets removed.
- Video or screenshots of a complete Claude connection flow.
- ChatGPT connection evidence when the available plan supports custom MCP; otherwise documented limitation and alternate client evidence.
- Two-account tenant-isolation test results.
- Vault locked/unlocked test results.
- Idempotency/concurrent write test results.
- Desktop/mobile screenshots of `/settings/connections`.
- Production build and HTTP smoke test.
- Post-deploy Vercel runtime-error check.
- Confirmation that production migrations were applied before traffic.

## 17. Acceptance criteria

The refactor is complete only when all of the following are true:

- The Jobmark internal chat UI and runtime are no longer active.
- `/settings/connections` is the minimal Add MCP connection page matching this specification.
- No internal chat route is active.
- Legacy chat tables are removed by the cleanup migration.
- The remote MCP server is live at `/mcp` over Streamable HTTP.
- Major hosted clients can discover and authorize against it.
- Every remaining user-facing Jobmark capability in the parity matrix is available through MCP.
- Web and MCP paths use the same domain functions.
- Cross-account and vault protections are equivalent across transports.
- Passwords and other secrets never pass through normal model tool arguments.
- Destructive actions require server-enforced confirmation/step-up behavior.
- Tool outputs are structured, bounded, and validated.
- Retried creates do not duplicate data.
- Tool names and schemas are snapshot-tested and documented as a compatibility contract.
- README, landing content, privacy, terms, and security docs reflect the new product direction.
- Production migrations and deployment have been verified at the exact merged commit.

## 18. Implementation order inside the single PR

1. Add the canonical specification and capability matrix.
2. Prove OAuth + stateless MCP transport on a Vercel preview.
3. Add connection, idempotency, and secure-action persistence.
4. Extract shared domain functions one domain at a time while keeping web tests green.
5. Register MCP tools against those functions.
6. Add connection management at `/settings/connections`.
7. Retire internal chat runtime/UI and remove old routes.
8. Update marketing, privacy, terms, README, and security documentation.
9. Complete parity, security, client, and UI verification.
10. Apply production migration, deploy, and smoke test.

## 19. Source references used for this specification

- MCP current-version and lifecycle documentation: https://modelcontextprotocol.io/docs/learn/versioning and https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle
- MCP Streamable HTTP transport: https://modelcontextprotocol.io/specification/2025-06-18/basic/transports
- MCP authorization: https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization
- MCP tools and structured outputs: https://modelcontextprotocol.io/specification/2025-11-25/server/tools
- MCP security guidance: https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices
- Vercel MCP Adapter/deployment guidance: https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel
- OpenAI custom MCP/app setup guidance: https://help.openai.com/en/articles/12584461-developer-mode-and-full-mcp-connectors-in-chatgpt-beta
- Anthropic remote custom connector guidance: https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp
