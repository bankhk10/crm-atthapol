// lib/auth.ts
import type { DefaultSession, NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { z } from "zod";

type ExtendedUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
};

type ExtendedToken = JWT & {
  id?: string;
  role?: string;
};

type SessionUser = DefaultSession["user"] & {
  id?: string;
  role?: string;
};

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  // ✅ เปลี่ยนเป็น JWT
  session: { strategy: "jwt" },

  providers: [
    Credentials({
      name: "Credentials",
      credentials: { email: {}, password: {} },
      authorize: async (raw) => {
        const parsed = z
          .object({
            email: z.string().email(),
            password: z.string().min(6),
          })
          .safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        const result: ExtendedUser = {
          id: user.id,
          name: user.name ?? null,
          email: user.email ?? null,
          role: user.role ?? "USER",
        };

        return result;
      },
    }),
  ],

  pages: { signIn: "/login" },

  // ✅ map ข้อมูลลง JWT แล้วส่งต่อให้ session
  callbacks: {
    async jwt({ token, user }) {
      const safeToken = token as ExtendedToken;
      if (user) {
        const extended = user as ExtendedUser;
        safeToken.id = extended.id;
        safeToken.role = extended.role ?? "USER";
        safeToken.name = extended.name ?? undefined;
        safeToken.email = extended.email ?? undefined;
      }
      return safeToken;
    },
    async session({ session, token }) {
      if (session.user) {
        const sessionUser = session.user as SessionUser;
        sessionUser.id = typeof token.id === "string" ? token.id : undefined;
        sessionUser.role = typeof token.role === "string" ? token.role : "USER";
        sessionUser.name = typeof token.name === "string" ? token.name : undefined;
        sessionUser.email = typeof token.email === "string" ? token.email : undefined;
      }
      return session;
    },
  },
};
