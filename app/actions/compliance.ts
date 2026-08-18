/**
 * Compliance onboarding actions.
 *
 * Why: Compliance state is written only on the server, derives ownership from
 * the authenticated session, and accepts explicit booleans instead of any
 * client-supplied user or timestamp values.
 */
'use server';

import { requireUserId } from '@/lib/auth';
import { getComplianceStatus, recordCurrentComplianceAcceptance } from '@/lib/compliance';
import { complianceAcceptanceInputSchema } from '@/lib/compliance-policy';
import { createComplianceCookieValue, COMPLIANCE_COOKIE_NAME } from '@/lib/compliance-cookie';
import { cookies } from 'next/headers';

async function setComplianceCookie(): Promise<void> {
  const cookieValue = await createComplianceCookieValue();
  if (!cookieValue) throw new Error('Compliance signing secret is not configured.');

  (await cookies()).set({
    name: COMPLIANCE_COOKIE_NAME,
    value: cookieValue,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}

export async function readCurrentCompliance() {
  const userId = await requireUserId();
  return getComplianceStatus(userId);
}

export async function acceptCurrentCompliance(input: unknown) {
  const parsed = complianceAcceptanceInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false as const,
      message: 'Confirm the age requirement and accept both current documents.',
    };
  }

  try {
    const userId = await requireUserId();
    await recordCurrentComplianceAcceptance(userId);
    await setComplianceCookie();

    return {
      success: true as const,
      status: await getComplianceStatus(userId),
    };
  } catch (error) {
    console.error('Failed to save compliance acceptance:', error);
    return {
      success: false as const,
      message: 'Your confirmation was not saved. Please try again.',
    };
  }
}
