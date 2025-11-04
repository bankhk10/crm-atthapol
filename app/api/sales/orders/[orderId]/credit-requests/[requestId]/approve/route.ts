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
      return NextResponse.json({ error: "ไม่มีสิทธิ์อนุมัติคำขอ" }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const approveIncrease = Math.max(0, Number(body?.approveIncrease ?? 0));
    const noteAppend = typeof body?.note === 'string' ? String(body.note) : undefined;

    const result = await prisma.$transaction(async (tx) => {
      const cr = await tx.creditRequest.findUnique({ where: { id: requestId } });
      if (!cr || (cr as any).deletedAt) throw new Error("NOT_FOUND");
      if ((cr as any).saleOrderId !== orderId) throw new Error("NOT_FOUND");
      if ((cr as any).status !== 'REQUESTED') throw new Error("INVALID_STATE");

      // Update credit limit for the customer
      const order = await tx.saleOrder.findUnique({ where: { id: orderId }, include: { customer: { include: { dealerDetail: true } } } });
      if (!order) throw new Error("NOT_FOUND");
      const dd = (order.customer as any)?.dealerDetail;
      if (!dd?.id) throw new Error("NO_DEALER_DETAIL");

      const inc = approveIncrease > 0 ? approveIncrease : Number((cr as any).requestedIncrease || 0);
      if (inc > 0) {
        await (tx as any).dealerDetail.update({ where: { id: dd.id }, data: { creditLimit: { increment: inc } } });
      }

      const actorId = session?.user?.id as string | undefined;
      const updated = await tx.creditRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED' as any,
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
    if (err instanceof Error && err.message === "NO_DEALER_DETAIL") {
      return NextResponse.json({ error: "ไม่พบข้อมูลเครดิตของลูกค้า" }, { status: 400 });
    }
    console.error("[POST /api/sales/orders/:id/credit-requests/:rid/approve] error", err);
    return NextResponse.json({ error: "อนุมัติคำขอไม่สำเร็จ" }, { status: 500 });
  }
}

