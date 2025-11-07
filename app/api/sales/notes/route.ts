import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getVisibilityScope, getCurrentEmployeeId } from "@/lib/sales-visibility";

export const runtime = "nodejs";

const CreateNoteSchema = z.object({
  customerId: z.string().optional(),
  managerEmployeeId: z.string().optional(),
  title: z.string().min(1, "กรอกหัวข้อบันทึก").optional(),
  content: z.string().optional(),
  amount: z.number().nonnegative().optional(),
  status: z.enum(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"]).optional(),
});

async function generateSnNumberTx(tx: any) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `SN-${y}${m}-`;
  const delegate = (tx as any)["docSequence"] as {
    upsert: (args: any) => Promise<{ current: number }>;
  };
  const row = await delegate.upsert({
    where: { prefix },
    create: { prefix, current: 1 },
    update: { current: { increment: 1 } },
    select: { current: true },
  });
  const seq = String(row.current).padStart(6, "0");
  return `${prefix}${seq}`;
}

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
  // OWN
  if (!employeeId) return { id: { equals: "__NO_MATCH__" } } as any;
  return { creatorEmployeeId: employeeId } as any;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const perms = session?.user?.permissions;
    if (!hasPermission(perms, "sales", "view")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึงบันทึกการขาย" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") || 20)));
    const skip = (page - 1) * pageSize;
    const status = (searchParams.get("status") || "").toUpperCase();
    const customerId = searchParams.get("customerId") || undefined;
    const q = (searchParams.get("q") || "").trim();

    const scope = getVisibilityScope(perms ?? []);
    const employeeId = await getCurrentEmployeeId();
    const dept = session?.user?.department ?? null;
    const scopeWhere = buildVisibilityWhere(scope, dept, employeeId);

    const where: any = { deletedAt: null };
    if (customerId) where.customerId = customerId;
    if (status) where.status = status as any;
    if (q) {
      where.OR = [
        { noteNumber: { contains: q, mode: "insensitive" } },
        { title: { contains: q, mode: "insensitive" } },
        { content: { contains: q, mode: "insensitive" } },
        { customer: { is: { companyName: { contains: q, mode: "insensitive" } } } },
      ];
    }

    const whereFinal = { ...where, ...scopeWhere } as any;

    const [items, total] = await Promise.all([
      prisma.salesNote.findMany({
        where: whereFinal,
        include: { customer: true, creator: true, manager: true, approvedBy: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.salesNote.count({ where: whereFinal }),
    ]);

    return NextResponse.json({ items, total, page, pageSize });
  } catch (err) {
    console.error("[GET /api/sales/notes] error", err);
    return NextResponse.json({ error: "ไม่สามารถดึงบันทึกการขายได้" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const perms = session?.user?.permissions;
    if (!hasPermission(perms, "sales", "create")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์สร้างบันทึกการขาย" }, { status: 403 });
    }

    const json = await req.json();
    const parsed = CreateNoteSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ถูกต้อง", issues: parsed.error.format() },
        { status: 400 },
      );
    }
    const data = parsed.data;

    const requested = (data.status as string | undefined) ?? "DRAFT";
    const wantsApprove = requested === "APPROVED";
    const wantsReject = requested === "REJECTED";
    if (
      (wantsApprove || wantsReject) &&
      !hasPermission(perms, "sales", wantsApprove ? "approve" : "reject")
    ) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์กำหนดสถานะอนุมัติ/ปฏิเสธ" }, { status: 403 });
    }

    const created = await prisma.$transaction(async (tx) => {
      const noteNumber = await generateSnNumberTx(tx);

      // Resolve current employee
      let creatorEmployeeId: string | null = null;
      if (session?.user?.id) {
        const emp = await tx.employee.findUnique({
          where: { userId: session.user.id },
          select: { id: true },
        });
        creatorEmployeeId = emp?.id ?? null;
      }

      let approvedAt: Date | null = null;
      let approvedByUserId: string | null = null;
      if (wantsApprove) {
        const actorId = session?.user?.id as string | undefined;
        if (actorId) {
          const actor = await tx.user.findUnique({ where: { id: actorId }, select: { id: true } });
          approvedByUserId = actor?.id ?? null;
          approvedAt = new Date();
        }
      }

      const submittedAt =
        requested === "SUBMITTED" || requested === "APPROVED" || requested === "REJECTED"
          ? new Date()
          : null;

      const note = await tx.salesNote.create({
        data: {
          noteNumber,
          customerId: data.customerId,
          managerEmployeeId: data.managerEmployeeId,
          creatorEmployeeId: creatorEmployeeId ?? undefined,
          title: data.title,
          content: data.content,
          amount: data.amount,
          status: requested as any,
          approvedAt,
          approvedByUserId,
          submittedAt,
        },
        include: { customer: true, creator: true, manager: true, approvedBy: true },
      });

      return note;
    });

    return NextResponse.json(created);
  } catch (err) {
    console.error("[POST /api/sales/notes] error", err);
    return NextResponse.json({ error: "สร้างบันทึกการขายไม่สำเร็จ" }, { status: 500 });
  }
}
