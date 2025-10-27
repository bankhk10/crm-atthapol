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

      const order = await tx.saleOrder.update({
        where: { id: orderId },
        data: {
          status: "APPROVED" as any,
          approvedAt: new Date(),
          approvedByUserId: (session?.user?.id as string | undefined) ?? null,
        },
        include: { items: true, reservations: true },
      });
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

