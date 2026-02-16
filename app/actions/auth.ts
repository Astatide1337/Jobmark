"use server";

import { signIn, signOut } from "@/lib/auth";

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/dashboard" });
}

export async function signOutUser() {
  try {
    await signOut({ redirect: true, redirectTo: "/" });
  } catch (error) {
    console.error("Sign out error:", error);
    // Force redirect even if there's an error
    throw error;
  }
}
