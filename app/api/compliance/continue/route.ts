import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { safeAuthRedirect } from '@/lib/auth-redirect';
import { getComplianceStatus } from '@/lib/compliance';
import { COMPLIANCE_COOKIE_NAME, createComplianceCookieValue } from '@/lib/compliance-cookie';
import { getAppPublicOrigin } from '@/lib/app-origin';

/**
 * Why: This is a real GET redirect instead of a Server Action form. The
 * onboarding screen can be rendered as the result of a middleware redirect,
 * and posting a Server Action to that protected original route is ambiguous
 * during the RSC navigation. This endpoint validates the database record,
 * issues the browser gate cookie, and returns to the requested local path.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const continueTo = safeAuthRedirect(requestUrl.searchParams.get('callbackUrl'));
  const publicOrigin = getAppPublicOrigin(request);
  const session = await auth();

  if (!session?.user?.id) {
    const signInUrl = new URL('/signin', publicOrigin);
    signInUrl.searchParams.set('callbackUrl', continueTo);
    return NextResponse.redirect(signInUrl);
  }

  const status = await getComplianceStatus(session.user.id);
  if (!status.isComplete) {
    const onboardingUrl = new URL('/onboarding', publicOrigin);
    onboardingUrl.searchParams.set('callbackUrl', continueTo);
    return NextResponse.redirect(onboardingUrl);
  }

  const cookieValue = await createComplianceCookieValue();
  if (!cookieValue) {
    return NextResponse.json(
      { error: 'Compliance signing secret is not configured.' },
      { status: 503 }
    );
  }

  const response = NextResponse.redirect(new URL(continueTo, publicOrigin));
  response.cookies.set({
    name: COMPLIANCE_COOKIE_NAME,
    value: cookieValue,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  return response;
}
