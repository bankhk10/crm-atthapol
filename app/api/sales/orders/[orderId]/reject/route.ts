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

      const prevWorkflow = String((order as any).workflowStatus ?? "DRAFT");
      if (["SHIPPED", "CANCELLED", "REJECTED", "EXPIRED"].includes(prevWorkflow)) {
        throw new Error("LOCKED");
      }

      await releaseOrderReservations(tx as any, orderId);

      const workflowStatus = "REJECTED";
      const status = mapWorkflowStatusToBaseStatus(workflowStatus as any);

      const updated = await tx.saleOrder.update({
        where: { id: orderId },
        data: {
          status: status as any,
          workflowStatus: workflowStatus as any,
          rejectReason,
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
      return NextResponse.json({ error: "เอกสารสถานะนี้ไม่สามารถปฏิเสธได้" }, { status: 400 });
    }
    console.error("[POST /api/sales/orders/:id/reject] error", err);
    return NextResponse.json({ error: "ปฏิเสธเอกสารไม่สำเร็จ" }, { status: 500 });
  }
}

