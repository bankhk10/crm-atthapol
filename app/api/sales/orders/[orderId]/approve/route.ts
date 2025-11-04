import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { buildSaleOrderVisibilityWhere } from "@/lib/sales-visibility";
import { mapWorkflowStatusToBaseStatus, shouldCommitStock } from "@/lib/sales-approval";
import { rebuildOrderStockCommit } from "@/lib/sale-order-stock";

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
      const exists = await tx.saleOrder.findFirst({
        where: { id: orderId, ...(scopeWhere as any) },
      });
      if (!exists || (exists as any).deletedAt) throw new Error("NOT_FOUND");

      const prevWorkflow = String((exists as any).workflowStatus ?? "DRAFT");
      if (["CANCELLED", "REJECTED", "EXPIRED"].includes(prevWorkflow)) {
        throw new Error("LOCKED");
      }
      if (["WAITING_PAYMENT_CONFIRMATION", "APPROVED", "AUTO_APPROVED", "SHIPPED"].includes(prevWorkflow)) {
        throw new Error("INVALID_STATE");
      }

      const paymentCondition =
        ((exists as any).paymentCondition as any) ?? "PREPAID";
      const nextWorkflow =
        paymentCondition === "PREPAID"
          ? "WAITING_PAYMENT_CONFIRMATION"
          : "APPROVED";
      const nextBaseStatus = mapWorkflowStatusToBaseStatus(nextWorkflow as any);
      const shouldApply = shouldCommitStock(nextWorkflow as any);

      const actorId = session?.user?.id as string | undefined;
      const actor = actorId
        ? await tx.user.findUnique({ where: { id: actorId }, select: { id: true } })
        : null;

      const order = await tx.saleOrder.update({
        where: { id: orderId },
        data: {
          status: nextBaseStatus as any,
          workflowStatus: nextWorkflow as any,
          autoApprovedBySystem: false,
          approvedAt: new Date(),
          approvedByUserId: actor?.id ?? null,
          creditEvaluationNote:
            paymentCondition === "PREPAID"
              ? "ผู้จัดการอนุมัติแล้ว รอตรวจสอบการชำระเงิน"
              : "ผู้จัดการอนุมัติแล้ว",
        },
        include: { items: true },
      });

      if (shouldApply) {
        await rebuildOrderStockCommit(tx as any, {
          id: order.id,
          shippingDate: order.shippingDate,
          items: order.items.map((it: any) => ({
            id: it.id,
            productId: it.productId ?? null,
            qty: it.qty ?? 0,
          })),
        });
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

