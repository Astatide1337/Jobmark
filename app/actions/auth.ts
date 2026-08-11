/**
 * Auth Server Actions
 *
 * Why: Standard wrappers for Auth.js methods to ensure consistent redirection
 * and error handling during login/logout flows.
 */
'use server';

import { signIn, signOut } from '@/lib/auth';
import { safeAuthRedirect } from '@/lib/auth-redirect';

export async function signInWithGoogle(formData?: FormData) {
  const callbackUrl = safeAuthRedirect(formData?.get('callbackUrl'));
  await signIn('google', { redirectTo: callbackUrl });
}

/** Start Google sign-in and return to the selected MCP app's simple setup. */
export async function signInToMcp(formData: FormData) {
  const requestedProvider = formData.get('provider');
  const provider =
    typeof requestedProvider === 'string' && ['claude', 'chatgpt', 'gemini'].includes(requestedProvider)
      ? requestedProvider
      : null;
  const redirectTo = provider ? `/chat?connect=${provider}` : '/chat';

  await signIn('google', { redirectTo });
}

export async function signOutUser() {
  try {
    await signOut({ redirect: true, redirectTo: '/' });
  } catch (error) {
    // NEXT_REDIRECT is expected - don't log it as an error
    if (error && typeof error === 'object' && 'digest' in error) {
      const digest = (error as { digest?: string }).digest;
      if (digest?.includes('NEXT_REDIRECT')) {
        return; // This is expected behavior
      }
    }
    console.error('Sign out error:', error);
    throw error;
  }
}
