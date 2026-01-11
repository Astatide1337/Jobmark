import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Edge-compatible auth config (no database adapter)
// This is used for middleware only
export const { auth: middleware } = NextAuth({
  providers: [
    Google({
      clientId: process.env.CLIENT_ID!,
      clientSecret: process.env.CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth }) {
      return !!auth;
    },
  },
});
