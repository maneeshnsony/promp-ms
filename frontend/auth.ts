import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import "@/lib/types";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account }) {
      if (account?.id_token) {
        const res = await fetch(`${process.env.API_BASE_URL}/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_token: account.id_token }),
        });

        if (res.ok) {
          const body: { data: { token: string } } = await res.json();
          token.backendToken = body.data.token;
        }
      }

      return token;
    },
    // No session callback: the backend bearer token stays only on the encrypted `token`
    // (JWT cookie), never copied onto `session` — that object is also what NextAuth's own,
    // unauthenticated GET /api/auth/session route returns to any same-origin script, so
    // putting a live bearer token there would widen the blast radius of any future XSS.
    // Server-side code reads it via lib/api.ts's getBackendToken(), which decodes the
    // session cookie directly instead of going through auth()/session().
  },
});
