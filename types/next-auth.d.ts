import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user?: DefaultSession["user"] & {
      id?: string;
      role?: string;
      roleKey?: string | null;
      roleName?: string | null;
      department?: string | null;
      permissions?: string[];
    };
  }

  interface User {
    role?: string;
    roleKey?: string | null;
    roleName?: string | null;
    department?: string | null;
    permissions?: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    roleKey?: string | null;
    roleName?: string | null;
    department?: string | null;
    permissions?: string[];
  }
}
