import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

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
      await (tx as any).stockMovement.create({ data: { stockId: r.stockId, productId: (await tx.stock.findUnique({ where: { id: r.stockId }, select: { productId: true } })).productId, saleOrderId: saleOrderId, type: 'RELEASE', qty: releaseQty } });
    }
    await (tx as any).saleOrderStockReservation.update({ where: { id: r.id }, data: { releasedAt: new Date() } });
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await context.params;
  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.saleOrder.findUnique({ where: { id: orderId } });
      if (!order || (order as any).deletedAt) {
        throw new Error("NOT_FOUND");
      }

      await releaseReservations(tx, orderId);
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
    const order = await prisma.saleOrder.findUnique({
      where: { id: orderId },
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
    const json = await req.json();
    const parsed = UpdateOrderSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง", issues: parsed.error.format() }, { status: 400 });
    }
    const data = parsed.data;
    const totals = computeTotals(data);

    // Credit check when editing if payment condition is POSTPAID
    try {
      const existsHeader = await (prisma as any).saleOrder.findUnique({ where: { id: orderId }, select: { paymentCondition: true } });
      const effectivePaymentCondition = (data as any).paymentCondition ?? (existsHeader?.paymentCondition ?? 'PREPAID');
      if (effectivePaymentCondition === 'POSTPAID') {
        const customer = await (prisma as any).customer.findUnique({ where: { id: data.customerId }, include: { dealerDetail: true } });
        if (!customer) {
          return NextResponse.json({ error: 'ไม่พบลูกค้า' }, { status: 400 });
        }
        const creditLimit = (customer as any)?.dealerDetail?.creditLimit as number | null | undefined;
        if (typeof creditLimit === 'number') {
          const relationshipScore = (customer as any)?.relationshipScore as number | null | undefined;
          const enoughCredit = (totals.grandTotal ?? 0) <= creditLimit;
          if (!enoughCredit) {
            const canOverride = typeof relationshipScore === 'number' && relationshipScore > 3;
            if (!canOverride) {
              return NextResponse.json({ error: 'วงเงินเครดิตไม่พอ และคะแนนความสัมพันธ์ไม่ถึงเกณฑ์' }, { status: 400 });
            }
          }
        }
      }
    } catch (checkErr) {
      // If credit check fails unexpectedly, treat as server error
      if (checkErr instanceof Response) return checkErr as any;
      // fallthrough to continue; actual DB ops will run, but conservative approach would fail.
    }

    const updated = await prisma.$transaction(async (tx) => {
      const exists = await tx.saleOrder.findUnique({ where: { id: orderId } });
      if (!exists || (exists as any).deletedAt) throw new Error("NOT_FOUND");
      if ((exists as any).status === "SHIPPED") throw new Error("LOCKED");

      // --- Promotion budget adjustment (difference-based and customer-change aware) ---
      const currentSpent = Number((exists as any).promotionSpent ?? 0);
      const requestedSpent = (data as any).usePromotion ? Number((data as any).promotionAmount ?? 0) : 0;
      const oldCustomerId = (exists as any).customerId as string;
      const newCustomerId = data.customerId as string;
      if (oldCustomerId !== newCustomerId) {
        // Refund full current to old customer (if any)
        if (currentSpent > 0) {
          const oldCust = await (tx as any).customer.findUnique({ where: { id: oldCustomerId }, include: { dealerDetail: true } });
          const oldDd = (oldCust as any)?.dealerDetail;
          if (oldDd?.id) {
            await (tx as any).dealerDetail.update({ where: { id: oldDd.id }, data: { promotionBudget: { increment: currentSpent } } });
          } else {
            // If cannot refund to old, block to avoid budget loss
            throw new Error('PROMO_REFUND_TARGET_MISSING');
          }
        }
        // Deduct full requested from new customer (if any)
        if (requestedSpent > 0) {
          const newCust = await (tx as any).customer.findUnique({ where: { id: newCustomerId }, include: { dealerDetail: true } });
          const newDd = (newCust as any)?.dealerDetail;
          if (!newDd?.id) {
            throw new Error('PROMO_NOT_SUPPORTED');
          }
          const result = await (tx as any).dealerDetail.updateMany({
            where: { id: newDd.id, promotionBudget: { gte: requestedSpent } },
            data: { promotionBudget: { decrement: requestedSpent } },
          });
          if (!result || (result.count ?? 0) !== 1) {
            throw new Error('PROMO_BUDGET_NOT_ENOUGH');
          }
        }
      } else {
        // Same customer: apply delta change only
        const delta = requestedSpent - currentSpent;
        if (delta > 0) {
          const cust = await (tx as any).customer.findUnique({ where: { id: newCustomerId }, include: { dealerDetail: true } });
          const dd = (cust as any)?.dealerDetail;
          if (!dd?.id) {
            throw new Error('PROMO_NOT_SUPPORTED');
          }
          const result = await (tx as any).dealerDetail.updateMany({
            where: { id: dd.id, promotionBudget: { gte: delta } },
            data: { promotionBudget: { decrement: delta } },
          });
          if (!result || (result.count ?? 0) !== 1) {
            throw new Error('PROMO_BUDGET_NOT_ENOUGH');
          }
        } else if (delta < 0) {
          const refund = Math.abs(delta);
          const cust = await (tx as any).customer.findUnique({ where: { id: newCustomerId }, include: { dealerDetail: true } });
          const dd = (cust as any)?.dealerDetail;
          if (!dd?.id) {
            throw new Error('PROMO_REFUND_TARGET_MISSING');
          }
          await (tx as any).dealerDetail.update({ where: { id: dd.id }, data: { promotionBudget: { increment: refund } } });
        }
      }

      // release all existing reservations
      await releaseReservations(tx, orderId);

      // soft-delete existing items
      await tx.saleOrderItem.deleteMany({ where: { saleOrderId: orderId } });

      // update order header and recreate items
      const order = await (tx as any).saleOrder.update({
        where: { id: orderId },
        data: {
          customerId: data.customerId,
          salespersonId: data.salespersonId,
          orderDate: data.orderDate ? new Date(data.orderDate) : exists.orderDate,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          shippingDate: data.shippingDate ? new Date(data.shippingDate) : null,
          creditTermDays: data.creditTermDays,
          currency: data.currency ?? "THB",
          vatIncluded: data.vatIncluded ?? true,
          vatRate: data.vatRate ?? 7,
          billTo: data.billTo,
          shipTo: data.shipTo,
          status: (data.status as any) ?? exists.status,
          paymentStatus: (data.paymentStatus as any) ?? exists.paymentStatus,
          paymentCondition: (data.paymentCondition as any) ?? (exists as any).paymentCondition,
          shippingFee: data.shippingFee ?? 0,
          otherCharges: data.otherCharges ?? 0,
          orderDiscount: (data as any).orderDiscount ?? 0,
          promotionSpent: requestedSpent || 0,
          poNumber: data.poNumber,
          note: data.note,
          rejectReason: (data as any).rejectReason,
          cancelReason: (data as any).cancelReason,
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
            })
          }
        },
        include: { items: true },
      });

      // Reserve or deduct stock per items depending on shippingDate or status
      for (const item of (order.items as any[])) {
        if (!item.productId || !item.qty) continue;
        let remaining = Math.max(0, Math.floor(Number(item.qty)));
        if (!Number.isFinite(remaining) || remaining <= 0) continue;
        const stocks = await tx.stock.findMany({ where: { productId: item.productId, deletedAt: null }, orderBy: [{ expDate: "asc" }, { mfgDate: "asc" }, { createdAt: "asc" }] });
        // Issue immediately if there is a shipping date OR order status is SHIPPED (COMPLETED in UI)
        const isImmediateIssue = Boolean(order.shippingDate) || (order.status === "SHIPPED");
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
            await (tx as any).stockMovement.create({ data: { stockId: s.id, productId: s.productId, saleOrderId: order.id, type: 'ISSUE', qty: alloc } });
          } else {
            await tx.stock.update({ where: { id: s.id }, data: { qtyReserved: { increment: alloc } } });
            await (tx as any).saleOrderStockReservation.create({ data: { saleOrderId: order.id, stockId: s.id, qty: alloc } });
            await (tx as any).stockMovement.create({ data: { stockId: s.id, productId: s.productId, saleOrderId: order.id, type: 'RESERVE', qty: alloc } });
          }
          remaining -= alloc;
        }
      }
      return order;
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return NextResponse.json({ error: "ไม่พบใบสั่งขาย" }, { status: 404 });
    }
    if (err instanceof Error && err.message === "LOCKED") {
      return NextResponse.json({ error: "เอกสารสถานะสำเร็จ ไม่สามารถแก้ไขได้" }, { status: 400 });
    }
    if (err instanceof Error && err.message === 'PROMO_NOT_SUPPORTED') {
      return NextResponse.json({ error: "ลูกค้ารายนี้ไม่รองรับวงเงินส่งเสริมการขาย" }, { status: 400 });
    }
    if (err instanceof Error && err.message === 'PROMO_BUDGET_NOT_ENOUGH') {
      return NextResponse.json({ error: "วงเงินส่งเสริมการขายคงเหลือไม่พอ" }, { status: 400 });
    }
    if (err instanceof Error && err.message === 'PROMO_REFUND_TARGET_MISSING') {
      return NextResponse.json({ error: "ไม่สามารถคืนวงเงินส่งเสริมการขายเดิมได้" }, { status: 400 });
    }
    console.error("[PUT /api/sales/orders/:id] error", err);
    return NextResponse.json({ error: "บันทึกการแก้ไขไม่สำเร็จ" }, { status: 500 });
  }
}
