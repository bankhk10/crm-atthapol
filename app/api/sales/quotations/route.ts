import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const runtime = "nodejs";

const ItemSchema = z.object({
  productId: z.string().optional(),
  nameSnapshot: z.string().optional(),
  productCodeSnapshot: z.string().optional(),
  unit: z.string().optional(),
  qty: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  discountPercent: z.number().min(0).max(100).optional().default(0),
  discountAmount: z.number().min(0).optional().default(0),
});

const CreateQuoteSchema = z.object({
  customerId: z.string(),
  salespersonId: z.string().optional(),
  quoteDate: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional().nullable(),
  paymentCondition: z.enum(["PREPAID","POSTPAID"]).optional(),
  creditTermDays: z.number().int().optional(),
  currency: z.string().default("THB"),
  vatIncluded: z.boolean().default(true),
  vatRate: z.number().min(0).default(7),
  shippingMethod: z.string().optional(),
  note: z.string().optional(),
  status: z.enum(["DRAFT","SENT","ACCEPTED","REJECTED","EXPIRED"]).optional(),
  shippingFee: z.number().min(0).optional().default(0),
  otherCharges: z.number().min(0).optional().default(0),
  orderDiscount: z.number().min(0).optional().default(0),
  items: z.array(ItemSchema).min(1),
});

type CreateInput = z.infer<typeof CreateQuoteSchema>;

function computeLine(item: z.infer<typeof ItemSchema>, defaultVatRate: number) {
  const base = item.qty * item.unitPrice;
  const disc = Math.max(0, item.discountAmount ?? 0);
  const discPct = Math.max(0, item.discountPercent ?? 0);
  const discFromPct = Math.max(0, base * (discPct / 100));
  const discountTotal = Math.min(base, disc + discFromPct);
  const taxable = Math.max(0, base - discountTotal);
  const vatRate = defaultVatRate;
  return { base, discountTotal, taxable, vatRate };
}

function computeTotals(payload: CreateInput) {
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

async function generateQtNumberTx(tx: any) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `QT-${y}${m}-`;
  const row = await (tx as any).docSequence.upsert({
    where: { prefix },
    create: { prefix, current: 1 },
    update: { current: { increment: 1 } },
    select: { current: true },
  });
  const seq = String(row.current).padStart(6, "0");
  return `${prefix}${seq}`;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const perms = session?.user?.permissions;
    if (!hasPermission(perms, "sales", "view")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึงใบเสนอราคา" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") || 20)));
    const skip = (page - 1) * pageSize;

    const customerId = searchParams.get("customerId") || undefined;
    const status = searchParams.get("status") || undefined; // DRAFT/SENT/...
    const customerQuery = searchParams.get("customer") || undefined; // ค้นหาชื่อลูกค้าแบบ contains
    const quoteDateFrom = searchParams.get("quoteDateFrom") || undefined;
    const quoteDateTo = searchParams.get("quoteDateTo") || undefined;
    const sortBy = (searchParams.get("sortBy") || "quoteDate").toString();
    const sortDir = ((searchParams.get("sortDir") || "desc").toString().toLowerCase() === "asc" ? "asc" : "desc") as "asc" | "desc";

    const where: any = { deletedAt: null };
    if (customerId) where.customerId = customerId;
    if (status && status !== "ALL") where.status = status as any;
    if (customerQuery) {
      where.customer = {
        OR: [
          { companyName: { contains: customerQuery, mode: "insensitive" } },
          { firstName: { contains: customerQuery, mode: "insensitive" } },
          { lastName: { contains: customerQuery, mode: "insensitive" } },
        ],
      };
    }
    if (quoteDateFrom || quoteDateTo) {
      const range: any = {};
      if (quoteDateFrom) {
        const d = new Date(quoteDateFrom);
        if (!isNaN(d.getTime())) range.gte = d;
      }
      if (quoteDateTo) {
        const d = new Date(quoteDateTo);
        if (!isNaN(d.getTime())) range.lte = d;
      }
      if (Object.keys(range).length > 0) where.quoteDate = range;
    }

    // map sortBy to valid Prisma keys
    const allowedSort: Record<string, string> = {
      quoteDate: "quoteDate",
      validUntil: "validUntil",
      quoteNumber: "quoteNumber",
      grandTotal: "grandTotal",
      status: "status",
    };
    const orderByKey = allowedSort[sortBy] || "quoteDate";

    const [total, items] = await Promise.all([
      (prisma as any).quote.count({ where }),
      (prisma as any).quote.findMany({
        where,
        orderBy: { [orderByKey]: sortDir },
        skip,
        take: pageSize,
        select: {
          id: true,
          quoteNumber: true,
          quoteDate: true,
          validUntil: true,
          grandTotal: true,
          status: true,
          customer: { select: { id: true, companyName: true, firstName: true, lastName: true, prefix: true } },
          salesperson: { select: { id: true, firstName: true, lastName: true, prefix: true } },
        },
      }),
    ]);

    return NextResponse.json({ total, items, page, pageSize });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "โหลดข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const perms = session?.user?.permissions;
    if (!hasPermission(perms, "sales", "create")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์สร้างใบเสนอราคา" }, { status: 403 });
    }
    const json = await req.json();
    const payload = CreateQuoteSchema.parse(json);
    const totals = computeTotals(payload);

    const created = await (prisma as any).$transaction(async (tx: any) => {
      const qt = await (tx as any).quote.create({
        data: {
          quoteNumber: await generateQtNumberTx(tx),
          customerId: payload.customerId,
          salespersonId: payload.salespersonId || undefined,
          quoteDate: payload.quoteDate ? new Date(payload.quoteDate) : new Date(),
          validUntil: payload.validUntil ? new Date(payload.validUntil) : undefined,
          paymentCondition: (payload.paymentCondition as any) ?? "PREPAID",
          creditTermDays: payload.creditTermDays ?? undefined,
          currency: payload.currency,
          vatIncluded: payload.vatIncluded,
          vatRate: payload.vatRate,
          shippingMethod: payload.shippingMethod || undefined,
          note: payload.note || undefined,
          status: (payload.status as any) ?? "DRAFT",
          subTotal: totals.subTotal,
          discountTotal: totals.discountTotal,
          orderDiscount: Number(payload.orderDiscount ?? 0),
          taxAmount: totals.taxAmount,
          shippingFee: Number(payload.shippingFee ?? 0),
          otherCharges: Number(payload.otherCharges ?? 0),
          grandTotal: totals.grandTotal,
          items: {
            create: payload.items.map((it) => ({
              productId: it.productId || undefined,
              productCodeSnapshot: it.productCodeSnapshot || undefined,
              nameSnapshot: it.nameSnapshot || "",
              unit: it.unit || undefined,
              qty: it.qty,
              unitPrice: it.unitPrice,
              discountPercent: it.discountPercent ?? 0,
              discountAmount: it.discountAmount ?? 0,
              amount: Math.max(0, it.qty * it.unitPrice - (it.discountAmount ?? 0) - Math.max(0, (it.discountPercent ?? 0) / 100 * (it.qty * it.unitPrice))),
            })),
          },
        },
        select: { id: true, quoteNumber: true },
      });
      return qt;
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    const msg = e?.message || "บันทึกไม่สำเร็จ";
    try {
      const zerr = JSON.parse(msg);
      return NextResponse.json({ error: zerr?.message || msg }, { status: 400 });
    } catch (_) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }
}
