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
  roleKey?: string | null;
  roleName?: string | null;
  department?: string | null;
  permissions: string[];
};

type ExtendedToken = JWT & {
  id?: string;
  role?: string;
  roleKey?: string | null;
  roleName?: string | null;
  department?: string | null;
  permissions?: string[];
};

type SessionUser = DefaultSession["user"] & {
  id?: string;
  role?: string;
  roleKey?: string | null;
  roleName?: string | null;
  department?: string | null;
  permissions?: string[];
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
        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            roleDefinition: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
            employee: true,
          },
        });
        if (!user || !user.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        const permissionSet = new Set<string>();
        user.roleDefinition?.permissions.forEach((assignment) => {
          const category = assignment.permission.category?.trim();
          const name = assignment.permission.name?.trim();
          if (!category || !name) {
            return;
          }
          permissionSet.add(`${category}:${name}`);
        });

        const result: ExtendedUser = {
          id: user.id,
          name: user.name ?? null,
          email: user.email ?? null,
          role: user.role ?? "USER",
          roleKey: user.roleDefinition?.key ?? null,
          roleName: user.roleDefinition?.name ?? null,
          department: user.employee?.department ?? null,
          permissions: Array.from(permissionSet.values()),
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
        safeToken.roleKey = extended.roleKey ?? null;
        safeToken.roleName = extended.roleName ?? null;
        safeToken.department = extended.department ?? null;
        safeToken.permissions = extended.permissions ?? [];
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
        sessionUser.roleKey = typeof token.roleKey === "string" ? token.roleKey : null;
        sessionUser.roleName = typeof token.roleName === "string" ? token.roleName : null;
        sessionUser.department =
          typeof token.department === "string" ? token.department : null;
        sessionUser.permissions = Array.isArray(token.permissions)
          ? (token.permissions as string[])
          : [];
      }
      return session;
    },
  },
};
