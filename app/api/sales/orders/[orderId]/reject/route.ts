import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { buildSaleOrderVisibilityWhere } from "@/lib/sales-visibility";

export const runtime = "nodejs";

async function releaseReservations(tx: any, saleOrderId: string) {
  const reservations = await (tx as any).saleOrderStockReservation.findMany({
    where: { saleOrderId, releasedAt: null, deletedAt: null },
  });

  for (const r of reservations as any[]) {
    const stock = await tx.stock.findUnique({ where: { id: r.stockId }, select: { qtyReserved: true } });
    const current = Number(stock?.qtyReserved ?? 0);
    const qty = Math.max(0, Math.floor(Number(r.qty ?? 0)));
    const releaseQty = Math.min(current, qty);
    if (releaseQty > 0) {
      await tx.stock.update({ where: { id: r.stockId }, data: { qtyReserved: { decrement: releaseQty } } });
      const p = await tx.stock.findUnique({ where: { id: r.stockId }, select: { productId: true } });
      await (tx as any).stockMovement.create({ data: { stockId: r.stockId, productId: p?.productId as string, saleOrderId: saleOrderId, type: 'RELEASE', qty: releaseQty } });
    }
    await (tx as any).saleOrderStockReservation.update({ where: { id: r.id }, data: { releasedAt: new Date() } });
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await context.params;
  try {
    const session = await getServerSession(authOptions);
    const perms = session?.user?.permissions;
    if (!hasPermission(perms, "sales", "reject")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์ปฏิเสธเอกสาร" }, { status: 403 });
    }

    let rejectReason: string | undefined = undefined;
    try {
      const json = await req.json();
      const reason = (json?.reason || json?.rejectReason || "").trim();
      if (reason) rejectReason = reason;
    } catch {}

    const result = await prisma.$transaction(async (tx) => {
      const scopeWhere = await buildSaleOrderVisibilityWhere();
      const order = await tx.saleOrder.findFirst({ where: { id: orderId, ...(scopeWhere as any) } });
      if (!order || (order as any).deletedAt) {
        throw new Error("NOT_FOUND");
      }

      const status = String((order as any).status || "");
      if (status === "SHIPPED") throw new Error("LOCKED");
      if (status === "CANCELLED") throw new Error("LOCKED");

      await releaseReservations(tx, orderId);

      const updated = await tx.saleOrder.update({
        where: { id: orderId },
        data: { status: "CANCELLED" as any, rejectReason, approvedAt: null, approvedByUserId: null },
        include: { items: true, reservations: true },
      });
      return updated;
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return NextResponse.json({ error: "ไม่พบใบสั่งขาย" }, { status: 404 });
    }
    if (err instanceof Error && err.message === "LOCKED") {
      return NextResponse.json({ error: "เอกสารสถานะนี้ไม่สามารถปฏิเสธได้" }, { status: 400 });
    }
    console.error("[POST /api/sales/orders/:id/reject] error", err);
    return NextResponse.json({ error: "ปฏิเสธเอกสารไม่สำเร็จ" }, { status: 500 });
  }
}

