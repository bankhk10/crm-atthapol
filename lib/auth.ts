// lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { z } from "zod";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  // ✅ เปลี่ยนเป็น JWT
  session: { strategy: "jwt" },

  providers: [
    Credentials({
      name: "Credentials",
      credentials: { email: {}, password: {} },
      authorize: async (raw) => {
        const parsed = z.object({
          email: z.string().email(),
          password: z.string().min(6),
        }).safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          name: user.name ?? undefined,
          email: user.email ?? undefined,
          role: user.role ?? undefined,
        };
      },
    }),
  ],

  pages: { signIn: "/login" },

  // ✅ map ข้อมูลลง JWT แล้วส่งต่อให้ session
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        if ("id" in user && typeof user.id === "string") {
          token.id = user.id;
        }
        if ("role" in user) {
          const role = (user as { role?: string | null }).role;
          token.role = role ?? "USER";
        }
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.id) {
          session.user.id = token.id;
        }
        session.user.role = token.role ?? "USER";
        session.user.name = token.name ?? undefined;
        session.user.email = token.email ?? undefined;
      }
      return session;
    },
  },
};
