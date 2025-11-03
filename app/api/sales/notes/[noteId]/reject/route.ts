import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const runtime = "nodejs";

export async function POST(req: NextRequest, context: { params: Promise<{ noteId: string }> }) {
  const { noteId } = await context.params;
  try {
    const session = await getServerSession(authOptions);
    const perms = session?.user?.permissions;
    if (!hasPermission(perms, "sales", "reject")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์ปฏิเสธบันทึก" }, { status: 403 });
    }

    let rejectReason: string | undefined = undefined;
    try {
      const json = await req.json();
      const reason = (json?.reason || json?.rejectReason || "").trim();
      if (reason) rejectReason = reason;
    } catch {}

    const result = await prisma.$transaction(async (tx) => {
      const note = await tx.salesNote.findUnique({ where: { id: noteId } });
      if (!note || (note as any).deletedAt) throw new Error("NOT_FOUND");

      const status = String((note as any).status || "");
      if (status === "APPROVED" || status === "REJECTED") throw new Error("LOCKED");

      const updated = await tx.salesNote.update({
        where: { id: noteId },
        data: { status: "REJECTED" as any, rejectReason, approvedAt: null, approvedByUserId: null },
        include: { customer: true, creator: true, manager: true, approvedBy: true },
      });
      return updated;
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return NextResponse.json({ error: "ไม่พบบันทึกการขาย" }, { status: 404 });
    }
    if (err instanceof Error && err.message === "LOCKED") {
      return NextResponse.json({ error: "บันทึกถูกปิดสถานะแล้ว" }, { status: 400 });
    }
    console.error("[POST /api/sales/notes/:id/reject] error", err);
    return NextResponse.json({ error: "ปฏิเสธไม่สำเร็จ" }, { status: 500 });
  }
}

