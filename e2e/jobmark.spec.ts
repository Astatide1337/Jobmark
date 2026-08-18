import { expect, test } from '@playwright/test';
import { completeComplianceIfNeeded, mainNavigation, signInAsDemoUser } from './support/auth';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test.describe('public entry points', () => {
  test('publishes the current Terms and Privacy Policy versions', async ({ page }) => {
    const legalPages = [
      { path: '/terms', heading: 'Terms of Service', marker: 'Connected assistants' },
      { path: '/privacy', heading: 'Privacy Policy', marker: 'Cookies and similar storage' },
    ];

    for (const legalPage of legalPages) {
      await page.goto(legalPage.path);
      await expect(
        page.getByRole('heading', { name: legalPage.heading, exact: true })
      ).toBeVisible();
      await expect(page.getByText('Version 2026-08-18', { exact: false })).toBeVisible();
      await expect(page.locator('article')).toContainText(legalPage.marker);
      await expect(page.getByRole('link', { name: '← Jobmark', exact: true })).toHaveAttribute(
        'href',
        '/'
      );
    }
  });

  test('renders the public landing page and opens sign-in', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('main').first()).toContainText('Keep a clear record');
    await expect(
      page.getByRole('button', { name: 'Add a note', exact: true }).first()
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Common questions' })).toBeVisible();

    await page.getByRole('button', { name: 'Add a note', exact: true }).first().click();
    await expect(page.getByRole('dialog')).toContainText('Welcome to Jobmark');
    await expect(
      page.getByRole('dialog').getByRole('button', { name: 'Continue as Demo User', exact: true })
    ).toBeVisible();
  });

  test('supports the development-only demo sign-in', async ({ page }) => {
    await page.goto('/signin');
    await expect(page).toHaveTitle(/Sign in \| Jobmark/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Continue as Demo User', exact: true })
    ).toBeVisible();

    await page.getByRole('button', { name: 'Continue as Demo User', exact: true }).click();
    await completeComplianceIfNeeded(page);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole('heading', { name: /Good (morning|afternoon|evening)/i })
    ).toBeVisible();
  });
});

test.describe('authenticated shell', () => {
  test('navigates the authenticated shell through core routes', async ({ page }) => {
    await signInAsDemoUser(page);
    const nav = mainNavigation(page);

    await expect(nav).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Capture', exact: true })).toHaveAttribute(
      'aria-current',
      'page'
    );

    const routes = [
      { label: 'Projects', path: '/projects', heading: 'Projects' },
      { label: 'Reviews', path: '/reports', heading: 'Reviews' },
      { label: 'Insights', path: '/insights', heading: 'Insights' },
      { label: 'Network', path: '/network', heading: 'Network' },
      { label: 'Connect AI', path: '/settings/connections', heading: 'Connect AI' },
      { label: 'Settings', path: '/settings', heading: 'Settings' },
    ];

    for (const route of routes) {
      await page.goto('/dashboard');
      await expect(
        page.getByRole('heading', { name: /Good (morning|afternoon|evening)/i })
      ).toBeVisible();
      await nav.getByRole('link', { name: route.label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${route.path.replace('/', '\\/')}$`));
      await expect(
        page.getByRole('heading', { name: route.heading, exact: true }).last()
      ).toBeVisible();
      await expect(mainNavigation(page)).toBeVisible();
    }
  });
});

test.describe('core CRUD smoke paths', () => {
  test('creates a note from Capture', async ({ page }) => {
    await signInAsDemoUser(page);
    const note = `E2E browser smoke note: deterministic local test record ${Date.now()}.`;

    await page.locator('textarea[name="content"]').fill(note);
    await page.getByRole('button', { name: 'Save note', exact: true }).click();

    await expect(page.getByText('Note saved.', { exact: true })).toBeVisible();
    await expect(page.getByText(note, { exact: true })).toBeVisible();
  });

  test('creates, edits, and archives a project', async ({ page }) => {
    await signInAsDemoUser(page);
    await page.goto('/projects');

    const projectName = `E2E Browser Smoke Project ${Date.now()}`;
    await page
      .getByRole('button', { name: /New project|Create your first project/ })
      .first()
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toHaveText(/New project/);
    await dialog.locator('#name').fill(projectName);
    await dialog.locator('#desc').fill('Created by the local browser smoke test.');
    await dialog.getByRole('button', { name: 'Create project', exact: true }).click();

    await expect(page.getByRole('heading', { name: projectName, exact: true })).toBeVisible();
    await page
      .getByRole('button', { name: `More actions for ${projectName}`, exact: true })
      .click();
    await page.getByRole('menuitem', { name: 'Edit project', exact: true }).click();

    const editDialog = page.getByRole('dialog');
    await expect(editDialog).toHaveText(/Edit project/);
    await editDialog.locator('#desc').fill('Updated by the local browser smoke test.');
    await editDialog.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(
      page.getByText('Updated by the local browser smoke test.', { exact: true })
    ).toBeVisible();

    await page
      .getByRole('button', { name: `More actions for ${projectName}`, exact: true })
      .click();
    await page.getByRole('menuitem', { name: 'Archive project', exact: true }).click();
    await page.reload();
    const archivedTab = page.getByRole('tab', { name: 'Archived', exact: true });
    if (await archivedTab.isVisible()) {
      await archivedTab.click();
    } else {
      // The active-project empty state replaces the tabs with a direct link.
      await page.getByRole('button', { name: 'View archived projects', exact: true }).click();
    }
    await expect(page).toHaveURL(/\/projects\?filter=archived$/);
    await expect(page.getByRole('heading', { name: projectName, exact: true })).toBeVisible();
  });

  test('creates and edits a network contact', async ({ page }) => {
    await signInAsDemoUser(page);
    await page.goto('/network');

    const contactName = `E2E Browser Smoke Contact ${Date.now()}`;
    await page
      .getByRole('button', { name: /Add contact/ })
      .first()
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toHaveText(/Add contact/);
    await dialog.locator('#contact-fullName').fill(contactName);
    await dialog.locator('#contact-email').fill('e2e-contact@jobmark.local');
    await dialog.locator('#contact-relationship').fill('test collaborator');
    await dialog.getByRole('button', { name: 'Add contact', exact: true }).click();

    await expect(page.getByText(contactName, { exact: true })).toBeVisible();
    await page.getByRole('link', { name: new RegExp(contactName) }).click();
    await expect(page).toHaveURL(/\/network\/[^/]+$/);
    await page.getByRole('button', { name: 'Edit', exact: true }).click();

    const editDialog = page.getByRole('dialog');
    await expect(editDialog).toHaveText(/Edit contact/);
    await editDialog.locator('#contact-notes').fill('Updated by the local browser smoke test.');
    await editDialog.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(
      page.getByText('Updated by the local browser smoke test.', { exact: true })
    ).toBeVisible();
  });
});

test.describe('settings, focus, and safety gates', () => {
  test('renders settings tabs and exercises a safe data export', async ({ page }) => {
    await signInAsDemoUser(page);
    await page.goto('/settings');

    await expect(page.getByRole('tab', { name: 'Goals', exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Focus', exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Reviews', exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Appearance', exact: true })).toBeVisible();

    await page.getByRole('tab', { name: 'Appearance', exact: true }).click();
    await expect(page.getByText('Choose a color scheme.', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save appearance', exact: true })).toBeVisible();

    await page.getByRole('tab', { name: 'Data', exact: true }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export your data', exact: true }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^jobmark-export-\d{4}-\d{2}-\d{2}\.json$/);
  });

  test('requires exact confirmation before clearing notes or deleting an account', async ({
    page,
  }) => {
    await signInAsDemoUser(page);
    await page.goto('/settings');
    await page.getByRole('tab', { name: 'Data', exact: true }).click();

    await page.getByRole('button', { name: 'Clear', exact: true }).click();
    let dialog = page.getByRole('alertdialog');
    await expect(dialog).toContainText('Type CLEAR ALL NOTES to confirm');
    const clearButton = dialog.getByRole('button', { name: 'Clear all', exact: true });
    await expect(clearButton).toBeDisabled();
    await dialog
      .getByRole('textbox', { name: 'Confirmation for clearing all notes' })
      .fill('clear all notes');
    await expect(clearButton).toBeDisabled();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();

    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    dialog = page.getByRole('alertdialog');
    await expect(dialog).toContainText('Type DELETE to confirm');
    const deleteButton = dialog.getByRole('button', { name: 'Delete account', exact: true });
    await expect(deleteButton).toBeDisabled();
    await dialog
      .getByRole('textbox', { name: 'Confirmation for deleting your account' })
      .fill('DELETE');
    await expect(deleteButton).toBeEnabled();
    // Deliberately stop before clicking: account deletion is not part of E2E smoke.
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page).toHaveURL(/\/settings$/);
  });

  test('loads Focus and provides a safe exit back to Capture', async ({ page }) => {
    await signInAsDemoUser(page);
    await page.route('**/audio/weightless.mp3', route => route.abort());
    await page.goto('/focus');

    await expect(
      page.getByText("Bring to mind any tension you're carrying from today.", { exact: true })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Exit', exact: true })).toHaveAttribute(
      'href',
      '/dashboard'
    );
    await page.getByRole('link', { name: 'Exit', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});

test.describe('MCP discovery and protected transport', () => {
  test('serves OAuth discovery metadata and protected-resource metadata', async ({ request }) => {
    const expectedBaseURL = (process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000').replace(
      /\/$/,
      ''
    );
    const authServer = await request.get('/.well-known/oauth-authorization-server');
    expect(authServer.status()).toBe(200);
    const authMetadata = await authServer.json();
    expect(authMetadata).toMatchObject({
      issuer: expectedBaseURL,
      authorization_endpoint: `${expectedBaseURL}/api/auth/mcp/authorize`,
      token_endpoint: `${expectedBaseURL}/api/auth/mcp/token`,
    });

    const resource = await request.get('/.well-known/oauth-protected-resource');
    expect(resource.status()).toBe(200);
    expect(await resource.json()).toMatchObject({
      resource: `${expectedBaseURL}/mcp`,
      authorization_servers: [expectedBaseURL],
      bearer_methods_supported: ['header'],
    });
  });

  test('rejects unauthenticated MCP HTTP requests with OAuth guidance', async ({ request }) => {
    const response = await request.post('/mcp', {
      data: { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} },
    });

    expect(response.status()).toBe(401);
    expect(response.headers()['www-authenticate']).toContain('resource_metadata=');
    expect(await response.json()).toMatchObject({
      jsonrpc: '2.0',
      error: {
        code: -32600,
        data: { code: 'INVALID_TOKEN' },
      },
    });

    const getResponse = await request.get('/mcp');
    expect(getResponse.status()).toBe(401);
    expect(getResponse.headers()['www-authenticate']).toContain('resource_metadata=');
  });
});
