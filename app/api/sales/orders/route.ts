import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";

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

const CreateOrderSchema = z.object({
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
  items: z.array(OrderItemSchema).min(1),
}).superRefine((val, ctx) => {
  if (val.usePromotion) {
    const amt = val.promotionAmount ?? 0;
    if (!(typeof amt === 'number') || !(amt > 0)) {
      ctx.addIssue({ code: 'custom', path: ['promotionAmount'], message: 'กรอกจำนวนเงินส่งเสริมการขายให้ถูกต้อง' });
    }
  }
});

type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

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

function computeTotals(payload: CreateOrderInput) {
  const vatRate = payload.vatRate ?? 0;
  let subTotal = 0;
  let discountTotal = 0;
  let taxAmount = 0;

  for (const it of payload.items) {
    const { discountTotal: d, taxable, vatRate: lineVat } = computeLine(it, vatRate);
    subTotal += taxable;
    discountTotal += d;
    taxAmount += taxable * (lineVat / 100);
  }

  const shipping = payload.shippingFee ?? 0;
  const others = payload.otherCharges ?? 0;
  const od = Math.max(0, Number(payload.orderDiscount ?? 0));
  const grandTotal = Math.max(0, subTotal + taxAmount + shipping + others - od);

  return { subTotal, discountTotal, taxAmount, grandTotal };
}

async function generateSoNumberTx(tx: any) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `SO-${y}${m}-`;

  // Atomic upsert-based sequence increment per prefix
  const delegate = (tx as any)["docSequence"] as { upsert: (args: any) => Promise<{ current: number }> };
  const row = await delegate.upsert({
    where: { prefix },
    create: { prefix, current: 1 },
    update: { current: { increment: 1 } },
    select: { current: true },
  });
  // Pad the running number to 6 digits (e.g., SO-202501-000123)
  const seq = String(row.current).padStart(6, "0");
  return `${prefix}${seq}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") || 20)));
    const skip = (page - 1) * pageSize;

    const customerId = searchParams.get("customerId") || undefined;
    const status = searchParams.get("status") || undefined;
    // New filters: paymentStatus (single or comma-separated/repeated) and workflow (UI status)
    const paymentStatusParam = (searchParams.getAll as any)?.call(searchParams, "paymentStatus") ?? [];
    const workflow = (searchParams.get("workflow") || "").toUpperCase() || undefined;
    const shippingDateFrom = searchParams.get("shippingDateFrom") || undefined;
    const shippingDateTo = searchParams.get("shippingDateTo") || undefined;

    // Normalize paymentStatus values
    let paymentStatusValues: string[] | undefined = undefined;
    if (paymentStatusParam && paymentStatusParam.length > 0) {
      const parts: string[] = [];
      for (const p of paymentStatusParam) {
        if (!p) continue;
        const segs = String(p)
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean);
        parts.push(...segs);
      }
      if (parts.length > 0) paymentStatusValues = Array.from(new Set(parts));
    }

    // Build base where
    const where: any = { deletedAt: null, customerId };
    if (status) where.status = status as any;
    if (paymentStatusValues && paymentStatusValues.length > 0) {
      where.paymentStatus = paymentStatusValues.length === 1 ? (paymentStatusValues[0] as any) : ({ in: paymentStatusValues as any } as any);
    }

    // Apply workflow mapping to where when provided
    if (workflow && workflow !== "ALL") {
      switch (workflow) {
        case "DRAFT":
          where.status = "DRAFT";
          break;
        case "PENDING_APPROVAL":
        case "AWAITING_STOCK":
          where.status = "CONFIRMED";
          break;
        case "APPROVED":
        case "READY_TO_SHIP":
          where.status = "APPROVED";
          break;
        case "REJECTED":
        case "CANCELLED":
          where.status = "CANCELLED";
          break;
        case "AWAITING_PAYMENT":
          where.status = "INVOICED";
          where.paymentStatus = { in: ["UNPAID", "PARTIAL", "OVERDUE"] };
          break;
        case "PAID":
          where.status = "INVOICED";
          where.paymentStatus = "PAID";
          break;
        case "IN_TRANSIT":
          where.status = "SHIPPED";
          where.paymentStatus = { in: ["UNPAID", "PARTIAL", "OVERDUE"] };
          break;
        case "COMPLETED":
          where.status = "SHIPPED";
          where.paymentStatus = "PAID";
          break;
        default:
          break;
      }
    }

    // Apply shipping date range if provided
    if (shippingDateFrom || shippingDateTo) {
      const range: any = {};
      if (shippingDateFrom) {
        const d = new Date(shippingDateFrom);
        if (!isNaN(d.getTime())) range.gte = d;
      }
      if (shippingDateTo) {
        const d = new Date(shippingDateTo);
        if (!isNaN(d.getTime())) range.lte = d;
      }
      if (Object.keys(range).length > 0) (where as any).shippingDate = range;
    }

    const [items, total] = await Promise.all([
      prisma.saleOrder.findMany({
        where,
        include: { items: true, customer: true, salesperson: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.saleOrder.count({ where }),
    ]);

    return NextResponse.json({ items, total, page, pageSize });
  } catch (err) {
    console.error("[GET /api/sales/orders] error", err);
    return NextResponse.json({ error: "ไม่สามารถดึงรายการขายได้" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = CreateOrderSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง", issues: parsed.error.format() }, { status: 400 });
    }

  const data = parsed.data;

  const totals = computeTotals(data);

    // Pre-check credit if POSTPAID
    if ((data.paymentCondition ?? "PREPAID") === "POSTPAID") {
      const customer = await prisma.customer.findUnique({
        where: { id: data.customerId },
        include: { dealerDetail: true },
      });
      if (!customer) {
        return NextResponse.json({ error: "ไม่พบลูกค้า" }, { status: 400 });
      }
      const creditLimit = (customer as any)?.dealerDetail?.creditLimit as number | null | undefined;
      if (typeof creditLimit === 'number') {
        const relationshipScore = (customer as any)?.relationshipScore as number | null | undefined;
        const enoughCredit = totals.grandTotal <= creditLimit;
        if (!enoughCredit) {
          const canOverride = typeof relationshipScore === 'number' && relationshipScore > 3;
          if (!canOverride) {
            return NextResponse.json({ error: "วงเงินเครดิตไม่พอ และคะแนนความสัมพันธ์ไม่ถึงเกณฑ์" }, { status: 400 });
          }
        }
      }
    }

    let created: any | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        created = await prisma.$transaction(async (tx) => {
          const soNumber = await generateSoNumberTx(tx);
          // Handle promotion budget usage
          let promoUsed = 0;
          if (data.usePromotion && (data.promotionAmount ?? 0) > 0) {
            const amt = Number(data.promotionAmount || 0);
            const cust = await (tx as any).customer.findUnique({ where: { id: data.customerId }, include: { dealerDetail: true } });
            const dd = (cust as any)?.dealerDetail;
            if (!dd?.id) {
              throw new Error('PROMO_NOT_SUPPORTED');
            }
            // atomic conditional decrement
            const result = await (tx as any).dealerDetail.updateMany({
              where: { id: dd.id, promotionBudget: { gte: amt } },
              data: { promotionBudget: { decrement: amt } },
            });
            if (!result || (result.count ?? 0) !== 1) {
              throw new Error('PROMO_BUDGET_NOT_ENOUGH');
            }
            promoUsed = amt;
          }
          const order = await (tx as any).saleOrder.create({
            data: {
              soNumber,
              customerId: data.customerId,
              salespersonId: data.salespersonId,
              orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
              dueDate: data.dueDate ? new Date(data.dueDate) : null,
              shippingDate: data.shippingDate ? new Date(data.shippingDate) : null,
              creditTermDays: data.creditTermDays,
          currency: data.currency ?? "THB",
          vatIncluded: data.vatIncluded ?? true,
          vatRate: data.vatRate ?? 7,
          billTo: data.billTo,
          shipTo: data.shipTo,
          status: (data.status as any) ?? "DRAFT",
          paymentStatus: (data.paymentStatus as any) ?? "UNPAID",
          paymentCondition: (data.paymentCondition as any) ?? "PREPAID",
          shippingFee: data.shippingFee ?? 0,
          otherCharges: data.otherCharges ?? 0,
          orderDiscount: data.orderDiscount ?? 0,
          promotionSpent: promoUsed || 0,
          poNumber: data.poNumber,
          note: data.note,
          rejectReason: (data as any).rejectReason,
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
                    amount: taxable, // amount before VAT per line
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

          // Reserve or Deduct stock per item depending on shippingDate or status
          for (const item of order.items as any[]) {
            if (!item.productId || !item.qty) continue;
            let remaining = Math.max(0, Math.floor(Number(item.qty)));
            if (!Number.isFinite(remaining) || remaining <= 0) continue;

            const stocks = await tx.stock.findMany({
              where: { productId: item.productId, deletedAt: null },
              orderBy: [{ expDate: "asc" }, { mfgDate: "asc" }, { createdAt: "asc" }],
            });

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
                // Deduct on-hand immediately, do not reserve
                await tx.stock.update({ where: { id: s.id }, data: { qtyOnHand: { decrement: alloc } } });
                await (tx as any).stockMovement.create({ data: { stockId: s.id, productId: s.productId, saleOrderId: order.id, type: 'ISSUE', qty: alloc } });
              } else {
                // Reserve only
                await tx.stock.update({ where: { id: s.id }, data: { qtyReserved: { increment: alloc } } });
                await (tx as any).saleOrderStockReservation.create({ data: { saleOrderId: order.id, stockId: s.id, qty: alloc } });
                await (tx as any).stockMovement.create({ data: { stockId: s.id, productId: s.productId, saleOrderId: order.id, type: 'RESERVE', qty: alloc } });
              }
              remaining -= alloc;
            }
          }
          return order;
        });
        break; // success
      } catch (err) {
        if ((err as any)?.code === "P2002") {
          // soNumber unique conflict, retry outer transaction
          continue;
        }
        throw err;
      }
    }
    if (!created) {
      return NextResponse.json({ error: "เลขที่เอกสารถูกใช้แล้ว โปรดลองอีกครั้ง" }, { status: 409 });
    }

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "SO_NUMBER_CONFLICT") {
      return NextResponse.json({ error: "เลขที่เอกสารถูกใช้แล้ว โปรดลองอีกครั้ง" }, { status: 409 });
    }
    console.error("[POST /api/sales/orders] error", err);
    return NextResponse.json({ error: "บันทึกใบสั่งขายไม่สำเร็จ" }, { status: 500 });
  }
}
