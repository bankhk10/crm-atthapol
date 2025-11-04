import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const runtime = "nodejs";

export async function POST(req: NextRequest, context: { params: Promise<{ orderId: string; requestId: string }> }) {
  const { orderId, requestId } = await context.params;
  try {
    const session = await getServerSession(authOptions);
    const perms = session?.user?.permissions;
    if (!hasPermission(perms, "sales", "approve")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์ปฏิเสธคำขอ" }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const noteAppend = typeof body?.reason === 'string' ? String(body.reason) : (typeof body?.note === 'string' ? String(body.note) : undefined);

    const result = await prisma.$transaction(async (tx) => {
      const cr = await tx.creditRequest.findUnique({ where: { id: requestId } });
      if (!cr || (cr as any).deletedAt) throw new Error("NOT_FOUND");
      if ((cr as any).saleOrderId !== orderId) throw new Error("NOT_FOUND");
      if ((cr as any).status !== 'REQUESTED') throw new Error("INVALID_STATE");

      const actorId = session?.user?.id as string | undefined;
      const updated = await tx.creditRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED' as any,
          decidedByUserId: actorId ?? null,
          decidedAt: new Date(),
          note: noteAppend ? `${(cr as any).note ?? ''}\n${noteAppend}`.trim() : (cr as any).note,
        }
      });
      return updated;
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return NextResponse.json({ error: "ไม่พบคำขอ/ใบสั่งขาย" }, { status: 404 });
    }
    if (err instanceof Error && err.message === "INVALID_STATE") {
      return NextResponse.json({ error: "สถานะคำขอไม่ถูกต้อง" }, { status: 400 });
    }
    console.error("[POST /api/sales/orders/:id/credit-requests/:rid/reject] error", err);
    return NextResponse.json({ error: "ปฏิเสธคำขอไม่สำเร็จ" }, { status: 500 });
  }
}

