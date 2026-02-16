import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.CLIENT_ID!,
      clientSecret: process.env.CLIENT_SECRET!,
    }),
  ],
  pages: {
    // Auth modal handles sign-in on landing page
    error: "/",
  },
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days per ProductSpec
  },
  callbacks: {
    async session({ session, user, token }) {
      if (session.user) {
        session.user.id = user?.id ?? token?.sub ?? "";
        // Add Google profile image if available - check multiple sources
        const imageUrl = token?.picture as string | undefined || user?.image;
        if (imageUrl) {
          session.user.image = imageUrl;
        }
      }
      return session;
    },
    async jwt({ token, account, profile }) {
      // Persist the OAuth access_token and profile image to the token right after signin
      if (account && profile) {
        token.accessToken = account.access_token;
        // Get profile image from Google account with null checks
        const profileAny = profile as Record<string, unknown> | null;
        const picture = profileAny?.picture ?? profileAny?.image ?? null;
        token.picture = typeof picture === 'string' ? picture : null;
      }
      return token;
    },
  },
});
