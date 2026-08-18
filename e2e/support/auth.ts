import { expect, type Page } from '@playwright/test';

export async function signInAsDemoUser(page: Page, callbackUrl = '/dashboard') {
  await page.goto(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  await expect(
    page.getByRole('button', { name: 'Continue as Demo User', exact: true })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Continue as Demo User', exact: true }).click();
  await completeComplianceIfNeeded(page);
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(callbackUrl)}$`));
}

export async function completeComplianceIfNeeded(page: Page) {
  const onboardingHeading = page.getByRole('heading', {
    name: 'A quick confirmation before you begin',
    exact: true,
  });
  const completeHeading = page.getByRole('heading', { name: 'You’re all set', exact: true });
  const dashboardHeading = page.getByRole('heading', {
    name: /Good (morning|afternoon|evening)/i,
  });

  await expect(onboardingHeading.or(completeHeading).or(dashboardHeading)).toBeVisible();
  if (await dashboardHeading.count()) return;

  if (await onboardingHeading.count()) {
    for (const checkbox of await page.getByRole('checkbox').all()) {
      await checkbox.check();
    }
    await page.getByRole('button', { name: 'Confirm and continue', exact: true }).click();
  }

  await page.getByRole('link', { name: 'Continue to Jobmark', exact: true }).click();
  await expect(dashboardHeading).toBeVisible();
}

export function mainNavigation(page: Page) {
  return page.getByLabel('Main navigation', { exact: true });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
