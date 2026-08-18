# Browser E2E testing

The bounded browser smoke suite lives in `e2e/` and is configured by
`playwright.config.ts`. It is intentionally local-only: the config rejects any
`PLAYWRIGHT_BASE_URL` whose hostname is not `localhost` or `127.0.0.1`.

## Current setup

The repository declares `@playwright/test` as a development dependency. Install
the browser binary once on a local machine:

```bash
npm install --save-dev @playwright/test
npx playwright install chromium
```

After that one-time setup, use a development database in `.env.local` and run:

```bash
npm run dev
npx playwright test
```

The Playwright web server can also start `npm run dev` itself. If port 3000 is
already serving Jobmark, it reuses that local server. To use another local
port, set `PLAYWRIGHT_BASE_URL` to a localhost URL and start the app on the
matching port.

## Coverage and safety boundary

The suite covers the public landing page, development demo sign-in,
authenticated shell navigation, note/project/contact CRUD smoke paths, settings
tabs and export, Focus entry/exit, and OAuth/MCP discovery plus unauthenticated
transport behavior.

CRUD tests use clearly marked demo-user records. Project archival is the
reversible cleanup path; repeated runs may leave marked local test records,
including contacts created for the smoke path.
The suite never submits “Clear all notes” or “Delete account”. It verifies that
both actions require their exact confirmation text and stops before the final
irreversible click. Do not point these tests at production credentials or a
production database.

Artifacts on failure include a trace, screenshot, and video under Playwright's
test output. CI additionally emits an HTML report.
