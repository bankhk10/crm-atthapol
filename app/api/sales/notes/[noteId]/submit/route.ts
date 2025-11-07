import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getVisibilityScope, getCurrentEmployeeId } from "@/lib/sales-visibility";

export const runtime = "nodejs";

function buildVisibilityWhere(
  scope: "ALL" | "DEPARTMENT" | "OWN",
  department: string | null,
  employeeId: string | null,
) {
  if (scope === "ALL") return {} as Record<string, unknown>;
  if (scope === "DEPARTMENT") {
    if (!department) return { id: { equals: "__NO_MATCH__" } } as any;
    return { creator: { department } } as any;
  }
  if (!employeeId) return { id: { equals: "__NO_MATCH__" } } as any;
  return { creatorEmployeeId: employeeId } as any;
}

export async function POST(_req: NextRequest, context: { params: Promise<{ noteId: string }> }) {
  const { noteId } = await context.params;
  try {
    const session = await getServerSession(authOptions);
    const perms = session?.user?.permissions;
    // allow create/edit permissions to submit
    if (!hasPermission(perms, "sales", "edit") && !hasPermission(perms, "sales", "create")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์ส่งบันทึกเพื่ออนุมัติ" }, { status: 403 });
    }

    const scope = getVisibilityScope(perms ?? []);
    const empId = await getCurrentEmployeeId();
    const dept = session?.user?.department ?? null;
    const scopeWhere = buildVisibilityWhere(scope, dept, empId);

    const exists = await prisma.salesNote.findFirst({
      where: { id: noteId, ...(scopeWhere as any) },
    });
    if (!exists) return NextResponse.json({ error: "ไม่พบบันทึกการขาย" }, { status: 404 });

    const status = String((exists as any).status || "");
    if (status !== "DRAFT") {
      return NextResponse.json(
        { error: "ส่งเพื่ออนุมัติได้เฉพาะสถานะร่างเท่านั้น" },
        { status: 400 },
      );
    }

    const updated = await prisma.salesNote.update({
      where: { id: noteId },
      data: { status: "SUBMITTED" as any, submittedAt: new Date() },
      include: { customer: true, creator: true, manager: true, approvedBy: true },
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[POST /api/sales/notes/:id/submit] error", err);
    return NextResponse.json({ error: "ส่งเพื่ออนุมัติไม่สำเร็จ" }, { status: 500 });
  }
}
