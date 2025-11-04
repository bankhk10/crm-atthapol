import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { buildSaleOrderVisibilityWhere } from "@/lib/sales-visibility";
import { mapWorkflowStatusToBaseStatus } from "@/lib/sales-approval";
import { releaseOrderReservations } from "@/lib/sale-order-stock";

export const runtime = "nodejs";

export async function POST(req: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await context.params;
  try {
    const session = await getServerSession(authOptions);
    const perms = session?.user?.permissions;
    if (!hasPermission(perms, "sales", "reject")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์ยกเลิก/ปฏิเสธเอกสาร" }, { status: 403 });
    }
    let cancelReason: string | undefined = undefined;
    try {
      const json = await req.json();
      const reason = (json?.reason || json?.cancelReason || "").trim();
      if (reason) cancelReason = reason;
    } catch {}

    const result = await prisma.$transaction(async (tx) => {
      const scopeWhere = await buildSaleOrderVisibilityWhere();
      const order = await tx.saleOrder.findFirst({ where: { id: orderId, ...(scopeWhere as any) } });
      if (!order || (order as any).deletedAt) {
        throw new Error("NOT_FOUND");
      }

      const prevWorkflow = String((order as any).workflowStatus ?? "DRAFT");
      if (["CANCELLED", "REJECTED", "EXPIRED", "SHIPPED"].includes(prevWorkflow)) {
        throw new Error("LOCKED");
      }

      await releaseOrderReservations(tx as any, orderId);

      // If order had shippingDate OR status is SHIPPED (treated as issued), return qtyOnHand back
      const baseStatus = mapWorkflowStatusToBaseStatus(prevWorkflow as any);
      if ((order as any).shippingDate || baseStatus === "SHIPPED") {
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

      const workflowStatus = "CANCELLED";
      const status = mapWorkflowStatusToBaseStatus(workflowStatus as any);

      const updated = await tx.saleOrder.update({
        where: { id: orderId },
        data: {
          status: status as any,
          workflowStatus: workflowStatus as any,
          cancelReason,
          approvedAt: null,
          approvedByUserId: null,
          autoApprovedBySystem: false,
        },
        include: { items: true },
      });
      return updated;
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return NextResponse.json({ error: "ไม่พบใบสั่งขาย" }, { status: 404 });
    }
    if (err instanceof Error && err.message === "LOCKED") {
      return NextResponse.json({ error: "เอกสารสถานะนี้ไม่สามารถยกเลิกได้" }, { status: 400 });
    }
    console.error("[POST /api/sales/orders/:id/cancel] error", err);
    return NextResponse.json({ error: "ยกเลิกใบสั่งขายไม่สำเร็จ" }, { status: 500 });
  }
}
