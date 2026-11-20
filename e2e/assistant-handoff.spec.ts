import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { expect, test as base, type Locator, type Page } from '@playwright/test';
import {
  buildOutreachAssistantInstructions,
  buildReviewAssistantInstructions,
  buildSavedDraftAssistantInstructions,
} from '../lib/assistant-instructions';
import { signInAsDemoUser } from './support/auth';

const providers = [
  ['Claude', 'claude.ai'],
  ['ChatGPT', 'chatgpt.com'],
  ['Gemini', 'gemini.google.com'],
  ['E2E Other assistant', 'assistant.invalid'],
] as const;
const editedDraft = 'Équipe & ? #\nSecond line with 日本語 and <markup>.';

const test = base.extend<{ handoff: { id: string; label: string } }>({
  handoff: async ({ page }, runFixture) => {
    const url = process.env.DATABASE_URL ?? '';
    const database = URL.canParse(url) ? new URL(url) : null;
    if (
      !database ||
      !['postgres:', 'postgresql:'].includes(database.protocol) ||
      !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname) ||
      database.searchParams.has('host')
    ) {
      throw new Error(
        'Assistant handoff E2E needs DATABASE_URL for a local PostgreSQL test database.'
      );
    }

    await page.addInitScript(() => {
      let clipboard = '';
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          readText: async () => clipboard,
          writeText: async (text: string) => {
            clipboard = text;
          },
        },
      });
    });
    await page
      .context()
      .route(
        /^https:\/\/(claude\.ai|chatgpt\.com|gemini\.google\.com|assistant\.invalid)\//,
        route =>
          route.fulfill({ contentType: 'text/html', body: '<title>E2E provider stub</title>' })
      );
    await signInAsDemoUser(page);

    const db = new PrismaClient({ datasourceUrl: url });
    const id = randomUUID();
    const label = `E2E assistant handoff ${id}`;
    try {
      const { id: userId } = await db.user.findUniqueOrThrow({
        where: { email: 'dev-user@jobmark.local' },
        select: { id: true },
      });
      const settings = await db.userSettings.findUnique({
        where: { userId },
        select: { defaultTone: true },
      });
      const clients = providers.map(([, host]) => `https://${host}/jobmark-e2e/${id}`);

      await db.$transaction([
        db.activity.create({
          data: { id, userId, content: label, logDate: new Date(Date.now() - 86_400_000) },
        }),
        db.report.create({ data: { id, userId, title: label, content: 'Saved review fixture.' } }),
        db.contact.create({
          data: {
            id,
            userId,
            fullName: label,
            outreachDrafts: {
              create: { id, userId, title: label, content: 'Saved outreach fixture.' },
            },
          },
        }),
        ...providers.map(([clientName], index) =>
          db.oAuthClient.create({
            data: {
              clientId: clients[index],
              clientName,
              userId,
              redirectUris: [],
              mcpConnections: { create: { userId, clientName, scopes: ['jobmark:read'] } },
            },
          })
        ),
      ]);
      try {
        await runFixture({ id, label });
      } finally {
        await db.$transaction([
          db.activity.deleteMany({ where: { id, userId } }),
          db.report.deleteMany({ where: { id, userId } }),
          db.contact.deleteMany({ where: { id, userId } }),
          db.oAuthClient.deleteMany({ where: { clientId: { in: clients }, userId } }),
          ...(settings && settings.defaultTone !== 'professional'
            ? [
                db.userSettings.updateMany({
                  where: { userId, defaultTone: 'professional' },
                  data: { defaultTone: settings.defaultTone },
                }),
              ]
            : []),
        ]);
      }
    } finally {
      await db.$disconnect();
    }
  },
});

async function clipboard(page: Page) {
  return page.evaluate(() => navigator.clipboard.readText());
}

async function checkHandoff(
  page: Page,
  choose: () => Promise<void>,
  provider: string,
  expected: string
) {
  const before = await clipboard(page);
  const url = page.url();
  const pageCount = page.context().pages().length;
  await choose();
  const dialog = page.getByRole('dialog', { name: `Instructions for ${provider}`, exact: true });
  const prompt = dialog.getByRole('textbox', { name: 'Instructions', exact: true });
  await expect(prompt).toHaveValue(expected);
  await expect(prompt).toHaveAttribute('readonly', '');
  await expect(prompt).toBeFocused();
  expect(await clipboard(page)).toBe(before);
  expect(page.context().pages()).toHaveLength(pageCount);
  expect(page.url()).toBe(url);
  return { dialog, prompt };
}

async function copyInstructions(page: Page, dialog: Locator, expected: string) {
  await dialog.getByRole('button', { name: 'Copy instructions', exact: true }).click();
  await expect(dialog.getByRole('status')).toHaveText('Instructions copied.');
  expect(await clipboard(page)).toBe(expected);
}

async function providerLink(dialog: Locator, provider: string, url: string) {
  const link = dialog.getByRole('link', { name: `Open ${provider}`, exact: true });
  await expect(link).toHaveAttribute('href', url);
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  return link;
}

async function chooseFromMenu(section: Page | Locator, page: Page, provider: string) {
  await section.getByRole('button', { name: 'Continue with', exact: true }).click();
  const menu = page.getByRole('menu').and(page.locator('[data-state="open"]'));
  const item = menu.getByRole('menuitem', { name: new RegExp(`Edit with ${provider}$`) });
  await expect(item).toBeInViewport();
  await item.click();
  await expect(menu).toBeHidden();
}

test('hands off review focus and the current saved-review editor text locally', async ({
  page,
  context,
  handoff,
}) => {
  await page.goto('/reports');
  const focus = 'Équipe & ? # review focus';
  const next = page.getByRole('button', { name: 'Continue', exact: true });
  await next.click();
  await page.getByLabel('What should the draft mention? (optional)').fill(focus);
  await next.click();
  await page.getByRole('button', { name: /^Formal/ }).click();

  const review = buildReviewAssistantInstructions({
    period: 'Last 7 days',
    projectScope: 'All projects',
    tone: 'Formal',
    focus,
  });
  const chooser = page.getByRole('button', { name: /Edit with Claude$/ });
  const wizard = await checkHandoff(page, () => chooser.click(), 'Claude', review);
  await copyInstructions(page, wizard.dialog, review);

  const link = await providerLink(wizard.dialog, 'Claude', 'https://claude.ai/new');
  const popup = context.waitForEvent('page');
  await link.click();
  const provider = await popup;
  await provider.waitForURL('https://claude.ai/new');
  await provider.close();
  await expect(wizard.prompt).toHaveValue(review);
  await page.keyboard.press('Escape');
  await expect(chooser).toBeFocused();

  await page.getByRole('button', { name: 'Make review draft', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Review draft', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save draft', exact: true })).toBeEnabled();
  const editor = await checkHandoff(
    page,
    () => chooseFromMenu(page, page, 'ChatGPT'),
    'ChatGPT',
    review
  );
  await copyInstructions(page, editor.dialog, review);
  await providerLink(editor.dialog, 'ChatGPT', 'https://chatgpt.com/');
  await page.keyboard.press('Escape');
  await expect(editor.dialog).toBeHidden();

  await page.getByRole('tab', { name: 'Review drafts', exact: true }).click();
  await page.getByRole('button', { name: new RegExp(`^${handoff.label}`) }).click();
  const section = page.locator(`#report-${handoff.id}-content`);
  await section.getByRole('button', { name: 'Edit', exact: true }).click();
  await section.getByRole('textbox').fill(editedDraft);
  const expected = buildSavedDraftAssistantInstructions('review', editedDraft);
  const history = await checkHandoff(
    page,
    () => chooseFromMenu(section, page, 'ChatGPT'),
    'ChatGPT',
    expected
  );
  await page.evaluate(() => {
    navigator.clipboard.writeText = async () => {
      throw new Error('E2E clipboard denial');
    };
    document.execCommand = () => false;
  });
  await history.dialog.getByRole('button', { name: 'Copy instructions', exact: true }).click();
  await expect(history.dialog.getByRole('status')).toHaveText(
    'Could not copy the instructions. Select and copy the text manually.'
  );
  expect(await clipboard(page)).toBe(review);
  await history.prompt.press('ControlOrMeta+a');
  expect(
    await history.prompt.evaluate((element: HTMLTextAreaElement) =>
      element.value.slice(element.selectionStart, element.selectionEnd)
    )
  ).toBe(expected);
  await providerLink(history.dialog, 'ChatGPT', 'https://chatgpt.com/');
});

test('hands off outreach context and a longer edited draft without an unknown provider link', async ({
  page,
  handoff,
}) => {
  await page.goto(`/network/${handoff.id}`);
  await page.getByRole('tab', { name: 'Message drafts', exact: true }).click();
  const next = page.getByRole('button', { name: 'Next', exact: true });
  await next.click();
  await page.getByPlaceholder(/We worked together/).fill(editedDraft);
  await next.click();
  const outreachInput = {
    recipient: handoff.label,
    purpose: 'referral',
    channel: 'email',
    tone: 'warm',
    context: editedDraft,
  };
  const outreach = buildOutreachAssistantInstructions(outreachInput);
  const wizard = await checkHandoff(
    page,
    () => page.getByRole('button', { name: /Edit with Gemini$/ }).click(),
    'Gemini',
    outreach
  );
  await copyInstructions(page, wizard.dialog, outreach);
  await providerLink(wizard.dialog, 'Gemini', 'https://gemini.google.com/app');
  await page.keyboard.press('Escape');
  await expect(wizard.dialog).toBeHidden();

  await page.getByRole('button', { name: 'Make draft', exact: true }).click();
  const editor = page.getByPlaceholder('Your draft will show here...');
  await expect(editor).toHaveValue(/^Subject:/);
  await editor.fill(editedDraft);
  await expect(editor).toHaveValue(editedDraft);
  const current = buildOutreachAssistantInstructions({ ...outreachInput, draft: editedDraft });
  const wizardEditor = await checkHandoff(
    page,
    () => chooseFromMenu(page, page, 'Gemini'),
    'Gemini',
    current
  );
  await copyInstructions(page, wizardEditor.dialog, current);
  await page.keyboard.press('Escape');
  await expect(wizardEditor.dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Continue with', exact: true })).toBeFocused();

  await page.getByRole('button', { name: new RegExp(`^${handoff.label}`) }).click();
  const section = page.locator(`#outreach-draft-${handoff.id}-content`);
  await section.getByRole('button', { name: 'Edit', exact: true }).click();
  const longDraft = `${editedDraft}\n${'Full draft. '.repeat(200)}`;
  await section.getByRole('textbox').fill(longDraft);
  const expected = buildSavedDraftAssistantInstructions('outreach', longDraft);
  const history = await checkHandoff(
    page,
    () => chooseFromMenu(section, page, 'E2E Other assistant'),
    'E2E Other assistant',
    expected
  );
  await copyInstructions(page, history.dialog, expected);
  await expect(history.dialog.getByRole('link')).toHaveCount(0);
});
