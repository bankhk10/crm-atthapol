import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { buildSaleOrderVisibilityWhere, getVisibilityScope } from "@/lib/sales-visibility";

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
  status: z.enum(["DRAFT","CONFIRMED","APPROVED","REJECTED","PENDING","SHIPPED","INVOICED","EXPIRED","CANCELLED"]).optional(),
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
    const session = await getServerSession(authOptions);
    const perms = session?.user?.permissions;
    if (!hasPermission(perms, "sales", "view")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึงรายการขาย" }, { status: 403 });
    }

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
    // Search terms
    const so = (searchParams.get("so") || "").trim();
    const customerQ = (searchParams.get("customerQ") || "").trim();

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
    // Apply text searches if provided
    if (so) {
      (where as any).soNumber = { contains: so, mode: "insensitive" } as any;
    }
    if (customerQ) {
      (where as any).customer = {
        is: {
          OR: [
            { companyName: { contains: customerQ, mode: "insensitive" } },
            { firstName: { contains: customerQ, mode: "insensitive" } },
            { lastName: { contains: customerQ, mode: "insensitive" } },
            { prefix: { contains: customerQ, mode: "insensitive" } },
            { email: { contains: customerQ, mode: "insensitive" } },
            { phone: { contains: customerQ, mode: "insensitive" } },
          ],
        },
      } as any;
    }
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
          where.status = "APPROVED";
          break;
        case "READY_TO_SHIP":
          // In the new flow, READY_TO_SHIP maps to backend status PENDING
          where.status = "PENDING";
          break;
        case "REJECTED":
          where.status = "REJECTED";
          break;
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
        case "EXPIRED":
          where.status = "EXPIRED";
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

    const scopeWhere = await buildSaleOrderVisibilityWhere();

    const whereFinal: any = { ...where, ...scopeWhere };

    const [items, total] = await Promise.all([
      prisma.saleOrder.findMany({
        where: whereFinal,
        include: { items: true, customer: true, salesperson: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.saleOrder.count({ where: whereFinal }),
    ]);

    return NextResponse.json({ items, total, page, pageSize });
  } catch (err) {
    console.error("[GET /api/sales/orders] error", err);
    return NextResponse.json({ error: "ไม่สามารถดึงรายการขายได้" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const perms = session?.user?.permissions;
    if (!hasPermission(perms, "sales", "create")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์สร้างใบสั่งขาย" }, { status: 403 });
    }

    const json = await req.json();
    const parsed = CreateOrderSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง", issues: parsed.error.format() }, { status: 400 });
    }

  const data = parsed.data;

  const totals = computeTotals(data);

    // Status gating: only approvers can set APPROVED / CANCELLED on create
    const requestedStatus = (data.status as string | undefined) ?? "DRAFT";
    const wantsCancel = requestedStatus === "CANCELLED";
    if (wantsCancel && !hasPermission(perms, "sales", "reject")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์ปฏิเสธ/ยกเลิกเอกสาร" }, { status: 403 });
    }

    // Decide effective status with credit rule and auto-approve policy
    let effectiveStatus: "DRAFT" | "CONFIRMED" | "APPROVED" | "SHIPPED" | "INVOICED" | "CANCELLED" = "DRAFT";
    let approveNow = false;
    let approvalBySystem = false; // auto-approve without requiring user approve permission
    let extraNote: string | undefined;

    const paymentCondition = (data.paymentCondition ?? "PREPAID") as "PREPAID" | "POSTPAID";
    if (paymentCondition === "PREPAID") {
      // โอนก่อน: ส่งให้ผู้จัดการพิจารณา (สถานะรออนุมัติ)
      effectiveStatus = "CONFIRMED";
    } else {
      // POSTPAID: check credit with auto-approve when overage <= 10%
      const customer = await prisma.customer.findUnique({
        where: { id: data.customerId },
        include: { dealerDetail: true },
      });
      if (!customer) {
        return NextResponse.json({ error: "ไม่พบลูกค้า" }, { status: 400 });
      }
      const creditLimitRaw = (customer as any)?.dealerDetail?.creditLimit as number | null | undefined;
      const creditLimit = typeof creditLimitRaw === 'number' ? Math.max(0, creditLimitRaw) : 0;

      // Outstanding = sum grandTotal of open orders (not cancelled) with unpaid/partial/overdue
      const agg = await prisma.saleOrder.aggregate({
        _sum: { grandTotal: true },
        where: {
          customerId: data.customerId,
          deletedAt: null,
          status: { not: "CANCELLED" as any },
          paymentStatus: { in: ["UNPAID" as any, "PARTIAL" as any, "OVERDUE" as any] },
        },
      });
      const outstanding = Number((agg as any)?._sum?.grandTotal ?? 0) || 0;
      const availableCredit = Math.max(0, creditLimit - outstanding);
      const overage = Math.max(0, totals.grandTotal - availableCredit);
      const overagePct = creditLimit > 0 ? overage / creditLimit : 1;

      if (overage <= 0) {
        // เครดิตพอ → รออนุมัติจากผู้จัดการ
        effectiveStatus = "CONFIRMED";
      } else if (overagePct <= 0.10) {
        // เครดิตไม่พอ แต่เกินไม่เกิน 10% → auto-approve
        // If shipping date is provided, mark as PENDING (waiting to ship)
        effectiveStatus = data.shippingDate ? "PENDING" : "APPROVED";
        approveNow = true;
        approvalBySystem = true;
        extraNote = `AUTO_APPROVED (over by ${overage.toFixed(2)} = ${(overagePct * 100).toFixed(2)}% of credit limit)`;
      } else {
        // เครดิตไม่พอและเกิน 10% → ส่งให้ผู้จัดการตัดสินใจ/ขอเพิ่มวงเงิน
        effectiveStatus = "CONFIRMED";
        extraNote = `NEEDS_CREDIT_INCREASE (over by ${overage.toFixed(2)} = ${(overagePct * 100).toFixed(2)}% of credit limit)`;
      }
    }

    // If user explicitly requested APPROVED and has permission, allow manual approve
    if (!approvalBySystem && requestedStatus === "APPROVED") {
      if (!hasPermission(perms, "sales", "approve")) {
        return NextResponse.json({ error: "ไม่มีสิทธิ์อนุมัติเอกสาร" }, { status: 403 });
      }
      effectiveStatus = data.shippingDate ? "PENDING" : "APPROVED";
      approveNow = true;
    }

    let created: any | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        created = await prisma.$transaction(async (tx) => {
          // Resolve current employee (if any)
          let currentEmpId: string | null = null;
          if (session?.user?.id) {
            const emp = await tx.employee.findUnique({ where: { userId: session.user.id }, select: { id: true } });
            currentEmpId = emp?.id ?? null;
          }

          // Determine salesperson assignment with visibility guard
          let salespersonId: string | undefined = data.salespersonId;
          const scope = getVisibilityScope(perms);
          if (scope === "OWN") {
            // Force ownership to current employee soผู้ใช้งานเห็นเอกสารของตัวเองได้
            if (currentEmpId) {
              salespersonId = currentEmpId;
            }
          } else if (!salespersonId && currentEmpId) {
            // For broader scopes, still default to current employee when not provided
            salespersonId = currentEmpId;
          }
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
          // If creating in APPROVED state, validate approver user exists to avoid FK violation
          const actorId = approveNow && !approvalBySystem && session?.user?.id ? session.user.id : undefined;
          const approver = actorId ? await tx.user.findUnique({ where: { id: actorId }, select: { id: true } }) : null;

          const order = await (tx as any).saleOrder.create({
            data: {
              soNumber,
              customerId: data.customerId,
              salespersonId,
              orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
              dueDate: data.dueDate ? new Date(data.dueDate) : null,
              shippingDate: data.shippingDate ? new Date(data.shippingDate) : null,
              creditTermDays: data.creditTermDays,
              currency: data.currency ?? "THB",
              vatIncluded: data.vatIncluded ?? true,
              vatRate: data.vatRate ?? 7,
              billTo: data.billTo,
              shipTo: data.shipTo,
              status: (effectiveStatus as any),
              paymentStatus: (data.paymentStatus as any) ?? "UNPAID",
              paymentCondition: (data.paymentCondition as any) ?? "PREPAID",
              shippingFee: data.shippingFee ?? 0,
              otherCharges: data.otherCharges ?? 0,
              orderDiscount: data.orderDiscount ?? 0,
              promotionSpent: promoUsed || 0,
              poNumber: data.poNumber,
              note: extraNote ? [data.note ?? "", extraNote].filter(Boolean).join("\n") : data.note,
              rejectReason: (data as any).rejectReason,
              approvedAt: approveNow ? new Date() : null,
              approvedByUserId: approveNow ? (approver?.id ?? null) : null,
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

          // Perform stock operations only when approved now (manual or auto)
          if (approveNow) {
            for (const item of order.items as any[]) {
              if (!item.productId || !item.qty) continue;
              let remaining = Math.max(0, Math.floor(Number(item.qty)));
              if (!Number.isFinite(remaining) || remaining <= 0) continue;

              const stocks = await tx.stock.findMany({
                where: { productId: item.productId, deletedAt: null },
                orderBy: [{ expDate: "asc" }, { mfgDate: "asc" }, { createdAt: "asc" }],
              });

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
            // If we reserved (no shipping date), set reserveUntil deadline
            if (!order.shippingDate) {
              const ttlDays = Number(process.env.RESERVE_TTL_DAYS ?? '7');
              const safeDays = Number.isFinite(ttlDays) && ttlDays > 0 ? ttlDays : 7;
              const reserveUntil = new Date(Date.now() + safeDays * 24 * 60 * 60 * 1000);
              await tx.saleOrder.update({ where: { id: order.id }, data: { reserveUntil } });
            } else {
              // If shipping is known, clear reserveUntil
              await tx.saleOrder.update({ where: { id: order.id }, data: { reserveUntil: null } });
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

