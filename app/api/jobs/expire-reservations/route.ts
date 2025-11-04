import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

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

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const perms = session?.user?.permissions;
    if (!hasPermission(perms, "sales", "approve")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์เรียกใช้งานงานระบบ" }, { status: 403 });
    }

    const now = new Date();
    const expired = await prisma.$transaction(async (tx) => {
      const orders = await tx.saleOrder.findMany({
        where: {
          deletedAt: null,
          shippingDate: null,
          reserveUntil: { lte: now },
          status: { in: ["APPROVED" as any, "CONFIRMED" as any, "PENDING" as any] },
        },
        select: { id: true },
      });
      let count = 0;
      for (const o of orders) {
        await releaseReservations(tx, o.id);
        await tx.saleOrder.update({ where: { id: o.id }, data: { status: "EXPIRED" as any } });
        count++;
      }
      return count;
    });

    return NextResponse.json({ expired });
  } catch (err) {
    console.error("[GET /api/jobs/expire-reservations] error", err);
    return NextResponse.json({ error: "งานระบบล้มเหลว" }, { status: 500 });
  }
}

