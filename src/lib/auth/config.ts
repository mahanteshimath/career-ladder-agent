import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { getUserByEmail, createUser } from "@/lib/snowflake/queries";
import { verifyOtp } from "@/lib/auth/otp";

function normalizePersona(persona: unknown): "student" | "job_seeker" | "unset" {
  return persona === "student" || persona === "job_seeker" || persona === "unset"
    ? persona
    : "job_seeker";
}

type AuthUserMetadata = {
  id?: string;
  tier?: "free" | "basic" | "premium";
  persona?: "student" | "job_seeker" | "unset";
};

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
          ? {
              id: String(user.ID),
              email: String(user.EMAIL),
              name: String(user.NAME || user.EMAIL),
              image: user.IMAGE_URL ? String(user.IMAGE_URL) : undefined,
            }
          : null;
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      // Upsert user on sign-in (non-blocking — allow login even if DB is down)
      try {
        let existing = await getUserByEmail(user.email);
        if (!existing) {
          await createUser({
            email: user.email,
            name: user.name || user.email.split("@")[0],
            imageUrl: user.image || undefined,
          });
          existing = await getUserByEmail(user.email);
        }

        if (existing) {
          const authUser = user as AuthUserMetadata;
          user.id = String(existing.ID);
          authUser.tier = String(existing.TIER || "free") as AuthUserMetadata["tier"];
          authUser.persona = normalizePersona(existing.PERSONA);
        }
      } catch (err) {
        console.error("[auth] Snowflake upsert failed, allowing sign-in anyway:", (err as Error).message);
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.appUserId || token.sub || "");
        session.user.tier = String(token.tier || "free") as typeof session.user.tier;
        session.user.persona = normalizePersona(token.persona);
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        const authUser = user as AuthUserMetadata;
        token.sub = user.id;
        token.appUserId = user.id;
        token.tier = authUser.tier || "free";
        token.persona = authUser.persona || "job_seeker";
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
