import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await context.params;
  try {
    const session = await getServerSession(authOptions);
    const perms = session?.user?.permissions;
    if (!hasPermission(perms, "sales", "view")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึงข้อมูล" }, { status: 403 });
    }
    const items = await prisma.creditRequest.findMany({ where: { saleOrderId: orderId, deletedAt: null }, orderBy: { createdAt: "desc" } });
    return NextResponse.json(items);
  } catch (err) {
    console.error("[GET /api/sales/orders/:id/credit-requests] error", err);
    return NextResponse.json({ error: "ไม่สามารถดึงข้อมูลได้" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await context.params;
  try {
    const session = await getServerSession(authOptions);
    const perms = session?.user?.permissions;
    if (!hasPermission(perms, "sales", "edit")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์สร้างคำขอเพิ่มวงเงิน" }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const requestedIncrease = Math.max(0, Number(body?.requestedIncrease ?? 0));
    const note = typeof body?.note === 'string' ? String(body.note) : undefined;

    const created = await prisma.$transaction(async (tx) => {
      const order = await tx.saleOrder.findUnique({ where: { id: orderId }, include: { customer: { include: { dealerDetail: true } } } });
      if (!order || (order as any).deletedAt) throw new Error("NOT_FOUND");
      const creditLimit = Number((order.customer as any)?.dealerDetail?.creditLimit ?? 0);
      const agg = await tx.saleOrder.aggregate({ _sum: { grandTotal: true }, where: { customerId: order.customerId, deletedAt: null, status: { not: 'CANCELLED' as any }, paymentStatus: { in: ['UNPAID' as any, 'PARTIAL' as any, 'OVERDUE' as any] } } });
      const outstanding = Number((agg as any)?._sum?.grandTotal ?? 0) || 0;
      const available = Math.max(0, creditLimit - outstanding);
      const overage = Math.max(0, Number(order.grandTotal || 0) - available);
      const percentOver = creditLimit > 0 ? overage / creditLimit : 1;
      const requestedNewLimit = requestedIncrease > 0 ? creditLimit + requestedIncrease : undefined;
      const actorId = session?.user?.id as string | undefined;

      const cr = await tx.creditRequest.create({
        data: {
          saleOrderId: orderId,
          customerId: order.customerId,
          requestedIncrease,
          requestedNewLimit,
          amountOver: overage || null,
          percentOver: Number.isFinite(percentOver) ? percentOver : null,
          note,
          status: 'REQUESTED' as any,
          requestedByUserId: actorId ?? null,
        }
      });
      return cr;
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return NextResponse.json({ error: "ไม่พบใบสั่งขาย" }, { status: 404 });
    }
    console.error("[POST /api/sales/orders/:id/credit-requests] error", err);
    return NextResponse.json({ error: "สร้างคำขอไม่สำเร็จ" }, { status: 500 });
  }
}

