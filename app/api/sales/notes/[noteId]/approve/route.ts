import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(_req: NextRequest, context: { params: Promise<{ noteId: string }> }) {
  const { noteId } = await context.params;
  try {
    const session = await getServerSession(authOptions);
    const perms = session?.user?.permissions;
    if (!hasPermission(perms, "sales", "approve")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์อนุมัติบันทึก" }, { status: 403 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const exists = await tx.salesNote.findUnique({ where: { id: noteId } });
      if (!exists || (exists as any).deletedAt) throw new Error("NOT_FOUND");

      const status = String((exists as any).status || "");
      if (status === "APPROVED" || status === "REJECTED") throw new Error("LOCKED");
      if (status !== "SUBMITTED" && status !== "DRAFT") throw new Error("INVALID_STATE");

      const actorId = session?.user?.id as string | undefined;
      const actor = actorId
        ? await tx.user.findUnique({ where: { id: actorId }, select: { id: true } })
        : null;

      const note = await tx.salesNote.update({
        where: { id: noteId },
        data: {
          status: "APPROVED" as any,
          approvedAt: new Date(),
          approvedByUserId: actor?.id ?? null,
        },
        include: { customer: true, creator: true, manager: true, approvedBy: true },
      });
      return note;
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return NextResponse.json({ error: "ไม่พบบันทึกการขาย" }, { status: 404 });
    }
    if (err instanceof Error && err.message === "LOCKED") {
      return NextResponse.json({ error: "บันทึกถูกปิดสถานะแล้ว" }, { status: 400 });
    }
    if (err instanceof Error && err.message === "INVALID_STATE") {
      return NextResponse.json({ error: "ต้องอยู่ในสถานะรออนุมัติ/ร่างก่อน" }, { status: 400 });
    }
    console.error("[POST /api/sales/notes/:id/approve] error", err);
    return NextResponse.json({ error: "อนุมัติไม่สำเร็จ" }, { status: 500 });
  }
}
