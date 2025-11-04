import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { buildSaleOrderVisibilityWhere } from "@/lib/sales-visibility";

export const runtime = "nodejs";

export async function POST(_req: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await context.params;
  try {
    const session = await getServerSession(authOptions);
    const perms = session?.user?.permissions;
    if (!hasPermission(perms, "sales", "approve")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์อนุมัติเอกสาร" }, { status: 403 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const scopeWhere = await buildSaleOrderVisibilityWhere();
      const exists = await tx.saleOrder.findFirst({ where: { id: orderId, ...(scopeWhere as any) } });
      if (!exists || (exists as any).deletedAt) throw new Error("NOT_FOUND");

      const status = String((exists as any).status || "");
      if (status === "CANCELLED") throw new Error("LOCKED");
      if (status === "SHIPPED") throw new Error("LOCKED");
      if (status !== "CONFIRMED" && status !== "DRAFT") throw new Error("INVALID_STATE");

      // ตรวจสอบว่า user id ใน session มีอยู่จริงในตาราง User เพื่อเลี่ยง FK violation
      const actorId = session?.user?.id as string | undefined;
      const actor = actorId ? await tx.user.findUnique({ where: { id: actorId }, select: { id: true } }) : null;

      const newStatus = (exists as any).shippingDate ? ("PENDING" as any) : ("APPROVED" as any);
      const order = await tx.saleOrder.update({
        where: { id: orderId },
        data: {
          status: newStatus,
          approvedAt: new Date(),
          approvedByUserId: actor?.id ?? null,
        },
        include: { items: true, reservations: true },
      });

      // After approval: issue or reserve depending on shippingDate
      for (const item of (order as any).items as any[]) {
        if (!item.productId || !item.qty) continue;
        let remaining = Math.max(0, Math.floor(Number(item.qty)));
        if (!Number.isFinite(remaining) || remaining <= 0) continue;

        const stocks = await tx.stock.findMany({
          where: { productId: item.productId, deletedAt: null },
          orderBy: [{ expDate: "asc" }, { mfgDate: "asc" }, { createdAt: "asc" }],
        });

        const isImmediateIssue = Boolean((order as any).shippingDate) || ((order as any).status === "SHIPPED");
        for (const s of stocks as any[]) {
          if (remaining <= 0) break;
          const onHand = Number(s.qtyOnHand || 0);
          const reserved = Number(s.qtyReserved || 0);
          const available = Math.max(0, onHand - reserved);
          if (available <= 0) continue;
          const alloc = Math.min(available, remaining);
          if (alloc <= 0) continue;
          if (isImmediateIssue) {
            await tx.stock.update({ where: { id: s.id }, data: { qtyOnHand: { decrement: alloc } } });
            await (tx as any).stockMovement.create({ data: { stockId: s.id, productId: s.productId, saleOrderId: (order as any).id, type: 'ISSUE', qty: alloc } });
          } else {
            await tx.stock.update({ where: { id: s.id }, data: { qtyReserved: { increment: alloc } } });
            await (tx as any).saleOrderStockReservation.create({ data: { saleOrderId: (order as any).id, stockId: s.id, qty: alloc } });
            await (tx as any).stockMovement.create({ data: { stockId: s.id, productId: s.productId, saleOrderId: (order as any).id, type: 'RESERVE', qty: alloc } });
          }
          remaining -= alloc;
        }
      }
      // Maintain reserveUntil only if we reserved (no shipping date)
      if (!(order as any).shippingDate) {
        const ttlDays = Number(process.env.RESERVE_TTL_DAYS ?? '7');
        const safeDays = Number.isFinite(ttlDays) && ttlDays > 0 ? ttlDays : 7;
        const reserveUntil = new Date(Date.now() + safeDays * 24 * 60 * 60 * 1000);
        await tx.saleOrder.update({ where: { id: (order as any).id }, data: { reserveUntil } });
      } else {
        await tx.saleOrder.update({ where: { id: (order as any).id }, data: { reserveUntil: null } });
      }
      return order;
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return NextResponse.json({ error: "ไม่พบใบสั่งขาย" }, { status: 404 });
    }
    if (err instanceof Error && err.message === "LOCKED") {
      return NextResponse.json({ error: "สถานะเอกสารไม่สามารถอนุมัติได้" }, { status: 400 });
    }
    if (err instanceof Error && err.message === "INVALID_STATE") {
      return NextResponse.json({ error: "ต้องอยู่ในสถานะรออนุมัติ/ร่างก่อนจึงจะอนุมัติได้" }, { status: 400 });
    }
    console.error("[POST /api/sales/orders/:id/approve] error", err);
    return NextResponse.json({ error: "อนุมัติเอกสารไม่สำเร็จ" }, { status: 500 });
  }
}

