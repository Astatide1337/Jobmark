import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { safeAuthRedirect } from '@/lib/auth-redirect';
import { readCurrentCompliance } from '@/app/actions/compliance';
import { OnboardingForm } from './onboarding-form';

export const metadata: Metadata = {
  title: 'Account setup | Jobmark',
  description: 'Confirm your Jobmark account eligibility and review the current documents.',
};

/**
 * Why: This route is intentionally standalone so an authenticated entry point
 * can redirect here before enabling the rest of the product experience.
 */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/');
  }

  const status = await readCurrentCompliance();
  const params = await searchParams;
  const continueTo = safeAuthRedirect(params.callbackUrl);

  return <OnboardingForm status={status} userName={session.user.name} continueTo={continueTo} />;
}
