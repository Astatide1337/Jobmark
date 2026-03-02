/**
 * Auth Server Actions
 *
 * Why: Standard wrappers for Auth.js methods to ensure consistent redirection
 * and error handling during login/logout flows.
 */
'use server';

import { signIn, signOut } from '@/lib/auth';

export async function signInWithGoogle() {
  await signIn('google', { redirectTo: '/dashboard' });
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
