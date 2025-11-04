import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { buildSaleOrderVisibilityWhere } from "@/lib/sales-visibility";
import {
  evaluateSaleOrderWorkflow,
  mapWorkflowStatusToBaseStatus,
  shouldCommitStock,
} from "@/lib/sales-approval";
import {
  rebuildOrderStockCommit,
  releaseOrderReservations,
} from "@/lib/sale-order-stock";

export const runtime = "nodejs";

export async function DELETE(_req: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await context.params;
  try {
    const session = await getServerSession(authOptions);
    const perms = session?.user?.permissions;
    if (!hasPermission(perms, "sales", "delete")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์ลบใบสั่งขาย" }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      const scopeWhere = await buildSaleOrderVisibilityWhere();
      const order = await tx.saleOrder.findFirst({ where: { id: orderId, ...(scopeWhere as any) } });
      if (!order || (order as any).deletedAt) {
        throw new Error("NOT_FOUND");
      }

      await releaseOrderReservations(tx as any, orderId);
      // Soft delete via client extension
      await tx.saleOrder.delete({ where: { id: orderId } });
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return NextResponse.json({ error: "ไม่พบใบสั่งขาย" }, { status: 404 });
    }
    console.error("[DELETE /api/sales/orders/:id] error", err);
    return NextResponse.json({ error: "ลบใบสั่งขายไม่สำเร็จ" }, { status: 500 });
  }
}

// Fetch a single order with details
export async function GET(_req: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await context.params;
  try {
    const session = await getServerSession(authOptions);
    const perms = session?.user?.permissions;
    if (!hasPermission(perms, "sales", "view")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึงใบสั่งขาย" }, { status: 403 });
    }
    const scopeWhere = await buildSaleOrderVisibilityWhere();
    const order = await prisma.saleOrder.findFirst({
      where: { id: orderId, ...(scopeWhere as any) },
      include: { items: true, customer: true, salesperson: true, reservations: { include: { stock: true } } },
    });
    if (!order || (order as any).deletedAt) {
      return NextResponse.json({ error: "ไม่พบใบสั่งขาย" }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (err) {
    console.error("[GET /api/sales/orders/:id] error", err);
    return NextResponse.json({ error: "ไม่สามารถดึงข้อมูลได้" }, { status: 500 });
  }
}

// Update order and re-reserve stock
const OrderItemSchema = z.object({
  productId: z.string().optional(),
  nameSnapshot: z.string().optional(),
  productCodeSnapshot: z.string().optional(),
  unit: z.string().optional(),
  qty: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  discountPercent: z.number().min(0).max(100).optional().default(0),
  discountAmount: z.number().min(0).optional().default(0),
  lineVatRate: z.number().min(0).optional(),
  lotNumber: z.string().optional(),
  mfgDate: z.string().datetime().optional(),
  expDate: z.string().datetime().optional(),
  note: z.string().optional(),
});

const UpdateOrderSchema = z.object({
  customerId: z.string(),
  salespersonId: z.string().optional(),
  orderDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  shippingDate: z.string().datetime().optional(),
  creditTermDays: z.number().int().optional(),
  paymentCondition: z.enum(["PREPAID","POSTPAID"]).optional(),
  upfrontPaymentPercent: z.number().min(0).max(100).optional().default(0),
  currency: z.string().default("THB"),
  vatIncluded: z.boolean().default(true),
  vatRate: z.number().min(0).default(7),
  billTo: z.string().optional(),
  shipTo: z.string().optional(),
  status: z.enum(["DRAFT","CONFIRMED","APPROVED","SHIPPED","INVOICED","CANCELLED"]).optional(),
  paymentStatus: z.enum(["UNPAID","PARTIAL","PAID","OVERDUE"]).optional(),
  shippingFee: z.number().min(0).optional().default(0),
  otherCharges: z.number().min(0).optional().default(0),
  orderDiscount: z.number().min(0).optional().default(0),
  usePromotion: z.boolean().optional().default(false),
  promotionAmount: z.number().min(0).optional(),
  poNumber: z.string().optional(),
  note: z.string().optional(),
  rejectReason: z.string().optional(),
  cancelReason: z.string().optional(),
  workflowStatus: z
    .enum([
      "DRAFT",
      "WAITING_MANAGER_APPROVAL",
      "WAITING_PAYMENT_CONFIRMATION",
      "WAITING_CREDIT_EXTENSION",
      "AUTO_APPROVED",
      "APPROVED",
      "REJECTED",
      "EXPIRED",
      "PENDING_SHIPMENT",
      "SHIPPED",
      "CANCELLED",
    ])
    .optional(),
  autoApprovedBySystem: z.boolean().optional(),
  items: z.array(OrderItemSchema).min(1),
}).superRefine((val, ctx) => {
  if (val.usePromotion) {
    const amt = val.promotionAmount ?? 0;
    if (!(typeof amt === 'number') || !(amt > 0)) {
      ctx.addIssue({ code: 'custom', path: ['promotionAmount'], message: 'กรอกจำนวนเงินส่งเสริมการขายให้ถูกต้อง' });
    }
  }
});

function computeLine(item: z.infer<typeof OrderItemSchema>, defaultVatRate: number) {
  const base = item.qty * item.unitPrice;
  const disc = item.discountAmount ?? 0;
  const discPct = item.discountPercent ?? 0;
  const discFromPct = Math.max(0, base * (discPct / 100));
  const discountTotal = Math.min(base, disc + discFromPct);
  const taxable = Math.max(0, base - discountTotal);
  const vatRate = item.lineVatRate ?? defaultVatRate;
  return { base, discountTotal, taxable, vatRate };
}

function computeTotals(payload: z.infer<typeof UpdateOrderSchema>) {
  const vatRate = payload.vatRate ?? 0;
  let subTotal = 0;
  let discountTotal = 0;
  let taxAmount = 0;
  for (const it of payload.items) {
    const { discountTotal: d, taxable, vatRate: lineVat } = computeLine(it, vatRate);
    subTotal += taxable; discountTotal += d; taxAmount += taxable * (lineVat / 100);
  }
  const shipping = payload.shippingFee ?? 0; const others = payload.otherCharges ?? 0;
  const od = Math.max(0, Number((payload as any).orderDiscount ?? 0));
  const grandTotal = Math.max(0, subTotal + taxAmount + shipping + others - od);
  return { subTotal, discountTotal, taxAmount, grandTotal };
}

export async function PUT(req: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await context.params;
  try {
    const session = await getServerSession(authOptions);
    const perms = session?.user?.permissions;
    if (!hasPermission(perms, "sales", "edit")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์แก้ไขใบสั่งขาย" }, { status: 403 });
    }

    const json = await req.json();
    const parsed = UpdateOrderSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง", issues: parsed.error.format() }, { status: 400 });
    }

    const data = parsed.data;
    const totals = computeTotals(data);

    const scopeWhere = await buildSaleOrderVisibilityWhere();

    const updated = await prisma.$transaction(async (tx) => {
      const exists = await tx.saleOrder.findFirst({
        where: { id: orderId, ...(scopeWhere as any) },
      });
      if (!exists || (exists as any).deletedAt) throw new Error("NOT_FOUND");

      const prevWorkflowStatus = String((exists as any).workflowStatus ?? "DRAFT");
      const prevBaseStatus = mapWorkflowStatusToBaseStatus(prevWorkflowStatus as any);
      if (["CANCELLED", "REJECTED", "EXPIRED"].includes(prevWorkflowStatus)) {
        throw new Error("LOCKED");
      }
      if (prevBaseStatus === "SHIPPED") {
        throw new Error("LOCKED");
      }

      let shippingLocked = Boolean((exists as any).shippingLocked);
      let shippingUpdateCount = Number((exists as any).shippingUpdateCount ?? 0);

      const prevShippingDate = exists.shippingDate
        ? new Date(exists.shippingDate)
        : null;
      const shippingDateValue =
        data.shippingDate !== undefined && data.shippingDate !== null
          ? new Date(data.shippingDate)
          : prevShippingDate;
      const shippingDateChanged =
        (prevShippingDate?.getTime() || 0) !== (shippingDateValue?.getTime() || 0);
      if (shippingLocked && shippingDateChanged) {
        throw new Error("SHIPPING_LOCKED");
      }

      const dueDateValue =
        data.dueDate !== undefined && data.dueDate !== null
          ? new Date(data.dueDate)
          : exists.dueDate;
      const expiresAt = dueDateValue ?? null;

      const paymentCondition =
        (data.paymentCondition as any) ??
        ((exists as any).paymentCondition as any) ??
        "PREPAID";

      const upfrontPaymentPercent = (() => {
        if (
          data.upfrontPaymentPercent !== undefined &&
          data.upfrontPaymentPercent !== null
        ) {
          const raw = Number(data.upfrontPaymentPercent);
          return Number.isFinite(raw) ? Math.min(100, Math.max(0, raw)) : 0;
        }
        const existingPercent = Number((exists as any).upfrontPaymentPercent ?? 0);
        return Number.isFinite(existingPercent) ? existingPercent : 0;
      })();

      let creditLimit: number | null = null;
      let relationshipScore: number | null = null;
      if (paymentCondition === "POSTPAID") {
        const customer = await tx.customer.findUnique({
          where: { id: data.customerId },
          include: { dealerDetail: true },
        });
        if (!customer) {
          throw new Error("CUSTOMER_NOT_FOUND");
        }
        creditLimit =
          ((customer as any)?.dealerDetail?.creditLimit as number | undefined | null) ??
          null;
        relationshipScore = (customer as any)?.relationshipScore ?? null;
      }

      const evaluation = evaluateSaleOrderWorkflow({
        paymentCondition,
        grandTotal: totals.grandTotal,
        upfrontPaymentPercent,
        creditLimit,
        relationshipScore,
      });

      let nextWorkflowStatus =
        ((data as any).workflowStatus as any) ?? evaluation.workflowStatus;
      let autoApprovedBySystem = Boolean(
        (data as any).autoApprovedBySystem ?? evaluation.autoApprovedBySystem,
      );
      let creditEvaluationNote = evaluation.creditEvaluationNote;

      const requestedStatus = String((data as any).status ?? exists.status ?? "DRAFT");
      const wantsCancel =
        requestedStatus === "CANCELLED" || nextWorkflowStatus === "CANCELLED";
      const wantsApprove =
        requestedStatus === "APPROVED" ||
        nextWorkflowStatus === "APPROVED" ||
        nextWorkflowStatus === "WAITING_PAYMENT_CONFIRMATION" ||
        nextWorkflowStatus === "AUTO_APPROVED";

      if (wantsCancel && !hasPermission(perms, "sales", "reject")) {
        throw new Error("NO_REJECT");
      }

      if (
        wantsApprove &&
        !autoApprovedBySystem &&
        !hasPermission(perms, "sales", "approve")
      ) {
        throw new Error("NO_APPROVE");
      }

      if (wantsCancel) {
        nextWorkflowStatus = "CANCELLED";
        autoApprovedBySystem = false;
        creditEvaluationNote =
          data.cancelReason || data.rejectReason || creditEvaluationNote || "ยกเลิกรายการ";
      } else if (wantsApprove) {
        if (nextWorkflowStatus === "AUTO_APPROVED" && !autoApprovedBySystem) {
          autoApprovedBySystem = true;
        }
        if (nextWorkflowStatus !== "AUTO_APPROVED") {
          nextWorkflowStatus =
            paymentCondition === "PREPAID"
              ? "WAITING_PAYMENT_CONFIRMATION"
              : "APPROVED";
          autoApprovedBySystem = false;
        }
        if (!creditEvaluationNote) {
          creditEvaluationNote =
            paymentCondition === "PREPAID"
              ? "ผู้จัดการอนุมัติแล้ว รอตรวจสอบการชำระเงิน"
              : "ผู้จัดการอนุมัติแล้ว";
        }
      } else if (!(data as any).workflowStatus) {
        nextWorkflowStatus = evaluation.workflowStatus;
        autoApprovedBySystem = evaluation.autoApprovedBySystem;
      }

      if (nextWorkflowStatus !== "AUTO_APPROVED") {
        autoApprovedBySystem = false;
      }

      if (expiresAt && expiresAt.getTime() < Date.now() && !shippingDateValue) {
        nextWorkflowStatus = "EXPIRED";
        autoApprovedBySystem = false;
        shippingLocked = true;
      }

      if (shippingDateChanged) {
        shippingUpdateCount += 1;
        if (shippingUpdateCount >= 3 && nextWorkflowStatus !== "SHIPPED") {
          nextWorkflowStatus = "PENDING_SHIPMENT";
          shippingLocked = true;
        }
      }

      if (
        ["REJECTED", "EXPIRED", "CANCELLED"].includes(nextWorkflowStatus) &&
        !hasPermission(perms, "sales", "reject")
      ) {
        throw new Error("NO_REJECT");
      }

      const nextBaseStatus = mapWorkflowStatusToBaseStatus(nextWorkflowStatus as any);
      const shouldApplyStock = shouldCommitStock(nextWorkflowStatus as any);

      // --- Promotion budget adjustment (difference-based and customer-change aware) ---
      const currentSpent = Number((exists as any).promotionSpent ?? 0);
      const requestedSpent = (data as any).usePromotion
        ? Number((data as any).promotionAmount ?? 0)
        : 0;
      const oldCustomerId = (exists as any).customerId as string;
      const newCustomerId = data.customerId as string;
      if (oldCustomerId !== newCustomerId) {
        if (currentSpent > 0) {
          const oldCust = await (tx as any).customer.findUnique({
            where: { id: oldCustomerId },
            include: { dealerDetail: true },
          });
          const oldDd = (oldCust as any)?.dealerDetail;
          if (oldDd?.id) {
            await (tx as any).dealerDetail.update({
              where: { id: oldDd.id },
              data: { promotionBudget: { increment: currentSpent } },
            });
          } else {
            throw new Error("PROMO_REFUND_TARGET_MISSING");
          }
        }
        if (requestedSpent > 0) {
          const newCust = await (tx as any).customer.findUnique({
            where: { id: newCustomerId },
            include: { dealerDetail: true },
          });
          const newDd = (newCust as any)?.dealerDetail;
          if (!newDd?.id) {
            throw new Error("PROMO_NOT_SUPPORTED");
          }
          const result = await (tx as any).dealerDetail.updateMany({
            where: { id: newDd.id, promotionBudget: { gte: requestedSpent } },
            data: { promotionBudget: { decrement: requestedSpent } },
          });
          if (!result || (result.count ?? 0) !== 1) {
            throw new Error("PROMO_BUDGET_NOT_ENOUGH");
          }
        }
      } else {
        const delta = requestedSpent - currentSpent;
        if (delta > 0) {
          const cust = await (tx as any).customer.findUnique({
            where: { id: newCustomerId },
            include: { dealerDetail: true },
          });
          const dd = (cust as any)?.dealerDetail;
          if (!dd?.id) {
            throw new Error("PROMO_NOT_SUPPORTED");
          }
          const result = await (tx as any).dealerDetail.updateMany({
            where: { id: dd.id, promotionBudget: { gte: delta } },
            data: { promotionBudget: { decrement: delta } },
          });
          if (!result || (result.count ?? 0) !== 1) {
            throw new Error("PROMO_BUDGET_NOT_ENOUGH");
          }
        } else if (delta < 0) {
          const refund = Math.abs(delta);
          const cust = await (tx as any).customer.findUnique({
            where: { id: newCustomerId },
            include: { dealerDetail: true },
          });
          const dd = (cust as any)?.dealerDetail;
          if (!dd?.id) {
            throw new Error("PROMO_REFUND_TARGET_MISSING");
          }
          await (tx as any).dealerDetail.update({
            where: { id: dd.id },
            data: { promotionBudget: { increment: refund } },
          });
        }
      }

      await releaseOrderReservations(tx as any, orderId);
      await tx.saleOrderItem.deleteMany({ where: { saleOrderId: orderId } });

      const willBeApproved = nextBaseStatus === "APPROVED";
      const wasApproved = prevBaseStatus === "APPROVED";
      const actorId = willBeApproved && session?.user?.id ? session.user.id : undefined;
      const approver = actorId
        ? await tx.user.findUnique({ where: { id: actorId }, select: { id: true } })
        : null;
      const approvedAtValue = willBeApproved
        ? (wasApproved && (exists as any).approvedAt
            ? (exists as any).approvedAt
            : new Date())
        : null;
      const approvedByUserId = willBeApproved
        ? approver?.id ?? ((exists as any).approvedByUserId ?? null)
        : null;

      const order = await (tx as any).saleOrder.update({
        where: { id: orderId },
        data: {
          customerId: data.customerId,
          salespersonId: data.salespersonId,
          orderDate: data.orderDate ? new Date(data.orderDate) : exists.orderDate,
          dueDate: dueDateValue ?? null,
          shippingDate: shippingDateValue,
          creditTermDays: data.creditTermDays,
          currency: data.currency ?? "THB",
          vatIncluded: data.vatIncluded ?? true,
          vatRate: data.vatRate ?? 7,
          billTo: data.billTo,
          shipTo: data.shipTo,
          status: nextBaseStatus as any,
          workflowStatus: nextWorkflowStatus as any,
          autoApprovedBySystem,
          paymentStatus: (data.paymentStatus as any) ?? exists.paymentStatus,
          paymentCondition: paymentCondition as any,
          shippingFee: data.shippingFee ?? 0,
          otherCharges: data.otherCharges ?? 0,
          orderDiscount: (data as any).orderDiscount ?? 0,
          promotionSpent: requestedSpent || 0,
          poNumber: data.poNumber,
          note: data.note,
          rejectReason: data.rejectReason,
          cancelReason: data.cancelReason,
          creditEvaluationNote,
          upfrontPaymentPercent,
          shippingUpdateCount,
          shippingLocked,
          expiresAt,
          approvedAt: approvedAtValue,
          approvedByUserId,
          subTotal: totals.subTotal,
          discountTotal: totals.discountTotal,
          taxAmount: totals.taxAmount,
          grandTotal: totals.grandTotal,
          items: {
            create: data.items.map((it) => {
              const { taxable } = computeLine(it, data.vatRate ?? 0);
              return {
                productId: it.productId,
                nameSnapshot: it.nameSnapshot,
                productCodeSnapshot: it.productCodeSnapshot,
                unit: it.unit,
                qty: it.qty,
                unitPrice: it.unitPrice,
                discountPercent: it.discountPercent ?? 0,
                discountAmount: it.discountAmount ?? 0,
                lineVatRate: it.lineVatRate ?? undefined,
                amount: taxable,
                lotNumber: it.lotNumber,
                mfgDate: it.mfgDate ? new Date(it.mfgDate) : null,
                expDate: it.expDate ? new Date(it.expDate) : null,
                note: it.note,
              };
            }),
          },
        },
        include: { items: true },
      });

      if (shouldApplyStock) {
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
      return NextResponse.json({ error: "เอกสารสถานะนี้ไม่สามารถแก้ไขได้" }, { status: 400 });
    }
    if (err instanceof Error && err.message === "NO_APPROVE") {
      return NextResponse.json({ error: "ไม่มีสิทธิ์เปลี่ยนแปลงสถานะ/อนุมัติเอกสาร" }, { status: 403 });
    }
    if (err instanceof Error && err.message === "NO_REJECT") {
      return NextResponse.json({ error: "ไม่มีสิทธิ์ปฏิเสธ/ยกเลิกเอกสาร" }, { status: 403 });
    }
    if (err instanceof Error && err.message === "CUSTOMER_NOT_FOUND") {
      return NextResponse.json({ error: "ไม่พบข้อมูลลูกค้า" }, { status: 400 });
    }
    if (err instanceof Error && err.message === "SHIPPING_LOCKED") {
      return NextResponse.json({ error: "อัปเดตวันส่งของเกินจำนวนครั้งที่กำหนดแล้ว" }, { status: 400 });
    }
    if (err instanceof Error && err.message === "PROMO_NOT_SUPPORTED") {
      return NextResponse.json({ error: "ลูกค้ารายนี้ไม่รองรับวงเงินส่งเสริมการขาย" }, { status: 400 });
    }
    if (err instanceof Error && err.message === "PROMO_BUDGET_NOT_ENOUGH") {
      return NextResponse.json({ error: "วงเงินส่งเสริมการขายคงเหลือไม่พอ" }, { status: 400 });
    }
    if (err instanceof Error && err.message === "PROMO_REFUND_TARGET_MISSING") {
      return NextResponse.json({ error: "ไม่สามารถคืนวงเงินส่งเสริมการขายเดิมได้" }, { status: 400 });
    }
    console.error("[PUT /api/sales/orders/:id] error", err);
    return NextResponse.json({ error: "บันทึกการแก้ไขไม่สำเร็จ" }, { status: 500 });
  }
}
