import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    let cancelReason: string | undefined = undefined;
    try {
      const json = await req.json();
      const reason = (json?.reason || json?.cancelReason || "").trim();
      if (reason) cancelReason = reason;
    } catch {}

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.saleOrder.findUnique({ where: { id: orderId } });
      if (!order || (order as any).deletedAt) {
        throw new Error("NOT_FOUND");
      }

      await releaseReservations(tx, orderId);

      // If order had shippingDate OR status is SHIPPED (treated as issued), return qtyOnHand back
      if ((order as any).shippingDate || (order as any).status === "SHIPPED") {
        const items = await tx.saleOrderItem.findMany({ where: { saleOrderId: orderId } });
        for (const item of items as any[]) {
          if (!item.productId || !item.qty) continue;
          let remaining = Math.max(0, Math.floor(Number(item.qty)));
          if (!Number.isFinite(remaining) || remaining <= 0) continue;
          const stocks = await tx.stock.findMany({
            where: { productId: item.productId, deletedAt: null },
            orderBy: [{ expDate: "asc" }, { mfgDate: "asc" }, { createdAt: "asc" }],
          });
          for (const s of stocks as any[]) {
            if (remaining <= 0) break;
            const alloc = Math.min(remaining, Number.MAX_SAFE_INTEGER);
            if (alloc <= 0) continue;
            await tx.stock.update({ where: { id: s.id }, data: { qtyOnHand: { increment: alloc } } });
            await (tx as any).stockMovement.create({ data: { stockId: s.id, productId: s.productId, saleOrderId: orderId, type: 'RETURN', qty: alloc } });
            remaining -= alloc;
          }
        }
      }

      const updated = await tx.saleOrder.update({
        where: { id: orderId },
        data: { status: "CANCELLED" as any, cancelReason },
        include: { items: true, reservations: true },
      });
      return updated;
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return NextResponse.json({ error: "ไม่พบใบสั่งขาย" }, { status: 404 });
    }
    console.error("[POST /api/sales/orders/:id/cancel] error", err);
    return NextResponse.json({ error: "ยกเลิกใบสั่งขายไม่สำเร็จ" }, { status: 500 });
  }
}
