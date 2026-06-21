import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { getUserByEmail, createUser } from "@/lib/snowflake/queries";
import { verifyOtp } from "@/lib/auth/otp";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: "Email OTP",
      credentials: {
        email: { label: "Email", type: "email" },
        otp: { label: "Verification Code", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const otp = credentials?.otp as string | undefined;

        if (!email || !otp) return null;

        // Verify OTP — rejects invalid/expired/reused codes
        const isValid = await verifyOtp(email, otp);
        if (!isValid) return null;

        // OTP verified — get or create user
        let user = await getUserByEmail(email);
        if (!user) {
          await createUser({ email, name: email.split("@")[0] });
          user = await getUserByEmail(email);
        }

        return user
          ? { id: user.ID, email: user.EMAIL, name: user.NAME, image: user.IMAGE_URL }
          : null;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;

      // Upsert user on sign-in (non-blocking — allow login even if DB is down)
      try {
        const existing = await getUserByEmail(user.email);
        if (!existing) {
          await createUser({
            email: user.email,
            name: user.name || user.email.split("@")[0],
            imageUrl: user.image || undefined,
          });
        }
      } catch (err) {
        console.error("[auth] Snowflake upsert failed, allowing sign-in anyway:", (err as Error).message);
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user) {
        // Always set baseline ID from JWT so it's never undefined
        session.user.id = token.sub || "";

        if (token.sub) {
          try {
            const dbUser = await getUserByEmail(session.user.email!);
            if (dbUser) {
              session.user.id = dbUser.ID;
              (session.user as Record<string, unknown>).tier = dbUser.TIER;
              (session.user as Record<string, unknown>).persona = dbUser.PERSONA || "job_seeker";
            }
          } catch (err) {
            console.error("[auth] Session DB lookup failed:", (err as Error).message);
          }
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
