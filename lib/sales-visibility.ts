import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type VisibilityScope = "ALL" | "DEPARTMENT" | "OWN";

export function getVisibilityScope(permissions: readonly string[] | undefined): VisibilityScope {
  const set = new Set(permissions ?? []);
  if (set.has("sales_scope:all")) return "ALL";
  if (set.has("sales_scope:department")) return "DEPARTMENT";
  if (set.has("sales_scope:own")) return "OWN";
  // default safest visibility
  return "OWN";
}

export async function getCurrentEmployeeId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return null;
  const emp = await prisma.employee.findUnique({ where: { userId }, select: { id: true } });
  return emp?.id ?? null;
}

export async function buildSaleOrderVisibilityWhere(): Promise<Record<string, unknown>> {
  const session = await getServerSession(authOptions);
  const permissions = session?.user?.permissions ?? [];
  const scope = getVisibilityScope(permissions);

  if (scope === "ALL") return {};

  if (scope === "DEPARTMENT") {
    const department = session?.user?.department ?? null;
    if (!department) {
      // If no department info, return false predicate that yields no rows
      return { id: { equals: "__NO_MATCH__" } };
    }
    return { salesperson: { department } } as any;
  }

  // OWN
  const employeeId = await getCurrentEmployeeId();
  if (!employeeId) return { id: { equals: "__NO_MATCH__" } };
  return { salespersonId: employeeId } as any;
}
