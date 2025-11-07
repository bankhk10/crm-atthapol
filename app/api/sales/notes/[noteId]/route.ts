import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

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

export async function GET(_req: NextRequest, context: { params: Promise<{ noteId: string }> }) {
  const { noteId } = await context.params;
  try {
    const session = await getServerSession(authOptions);
    const perms = session?.user?.permissions;
    if (!hasPermission(perms, "sales", "view")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึงบันทึกการขาย" }, { status: 403 });
    }

    const scope = getVisibilityScope(perms ?? []);
    const empId = await getCurrentEmployeeId();
    const dept = session?.user?.department ?? null;
    const scopeWhere = buildVisibilityWhere(scope, dept, empId);

    const note = await prisma.salesNote.findFirst({
      where: { id: noteId, ...(scopeWhere as any) },
      include: { customer: true, creator: true, manager: true, approvedBy: true },
    });
    if (!note) return NextResponse.json({ error: "ไม่พบบันทึกการขาย" }, { status: 404 });
    return NextResponse.json(note);
  } catch (err) {
    console.error("[GET /api/sales/notes/:id] error", err);
    return NextResponse.json({ error: "ไม่สามารถดึงข้อมูลได้" }, { status: 500 });
  }
}

const UpdateSchema = z.object({
  customerId: z.string().optional(),
  managerEmployeeId: z.string().optional(),
  title: z.string().optional(),
  content: z.string().optional(),
  amount: z.number().nonnegative().optional(),
});

export async function PUT(req: NextRequest, context: { params: Promise<{ noteId: string }> }) {
  const { noteId } = await context.params;
  try {
    const session = await getServerSession(authOptions);
    const perms = session?.user?.permissions;
    if (!hasPermission(perms, "sales", "edit")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์แก้ไขบันทึกการขาย" }, { status: 403 });
    }

    const json = await req.json().catch(() => ({}));
    const parsed = UpdateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ถูกต้อง", issues: parsed.error.format() },
        { status: 400 },
      );
    }

    const scope = getVisibilityScope(perms ?? []);
    const empId = await getCurrentEmployeeId();
    const dept = session?.user?.department ?? null;
    const scopeWhere = buildVisibilityWhere(scope, dept, empId);

    const exists = await prisma.salesNote.findFirst({
      where: { id: noteId, ...(scopeWhere as any) },
    });
    if (!exists) return NextResponse.json({ error: "ไม่พบบันทึกการขาย" }, { status: 404 });

    const locked = (exists as any).status === "APPROVED" || (exists as any).status === "REJECTED";
    if (locked) {
      return NextResponse.json(
        { error: "เอกสารถูกอนุมัติ/ปฏิเสธแล้ว ไม่สามารถแก้ไขได้" },
        { status: 400 },
      );
    }

    const updated = await prisma.salesNote.update({
      where: { id: noteId },
      data: {
        customerId: parsed.data.customerId,
        managerEmployeeId: parsed.data.managerEmployeeId,
        title: parsed.data.title,
        content: parsed.data.content,
        amount: parsed.data.amount,
      },
      include: { customer: true, creator: true, manager: true, approvedBy: true },
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PUT /api/sales/notes/:id] error", err);
    return NextResponse.json({ error: "แก้ไขบันทึกการขายไม่สำเร็จ" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ noteId: string }> }) {
  const { noteId } = await context.params;
  try {
    const session = await getServerSession(authOptions);
    const perms = session?.user?.permissions;
    if (!hasPermission(perms, "sales", "delete")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์ลบบันทึกการขาย" }, { status: 403 });
    }

    await prisma.salesNote.delete({ where: { id: noteId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/sales/notes/:id] error", err);
    return NextResponse.json({ error: "ลบไม่สำเร็จ" }, { status: 500 });
  }
}
