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
  creditTermDays: z.number().int().optional(),
  currency: z.string().default("THB"),
  vatIncluded: z.boolean().default(true),
  vatRate: z.number().min(0).default(7),
  billTo: z.string().optional(),
  shipTo: z.string().optional(),
  status: z.enum(["DRAFT","CONFIRMED","APPROVED","SHIPPED","INVOICED","CANCELLED"]).optional(),
  paymentStatus: z.enum(["UNPAID","PARTIAL","PAID","OVERDUE"]).optional(),
  shippingFee: z.number().min(0).optional().default(0),
  otherCharges: z.number().min(0).optional().default(0),
  poNumber: z.string().optional(),
  note: z.string().optional(),
  items: z.array(OrderItemSchema).min(1),
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
  const grandTotal = subTotal + taxAmount + shipping + others;

  return { subTotal, discountTotal, taxAmount, grandTotal };
}

async function generateSoNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `SO-${y}${m}-`;
  const count = await prisma.saleOrder.count({
    where: { soNumber: { startsWith: prefix } },
  });
  const seq = String(count + 1).padStart(4, "0");
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

    const [items, total] = await Promise.all([
      prisma.saleOrder.findMany({
        where: {
          deletedAt: null,
          customerId,
          status: status as any,
        },
        include: { items: true, customer: true, salesperson: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.saleOrder.count({ where: { deletedAt: null, customerId, status: status as any } }),
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

    const soNumber = await generateSoNumber();
    const totals = computeTotals(data);

    const created = await prisma.saleOrder.create({
      data: {
        soNumber,
        customerId: data.customerId,
        salespersonId: data.salespersonId,
        orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        creditTermDays: data.creditTermDays,
        currency: data.currency ?? "THB",
        vatIncluded: data.vatIncluded ?? true,
        vatRate: data.vatRate ?? 7,
        billTo: data.billTo,
        shipTo: data.shipTo,
        status: (data.status as any) ?? "DRAFT",
        paymentStatus: (data.paymentStatus as any) ?? "UNPAID",
        shippingFee: data.shippingFee ?? 0,
        otherCharges: data.otherCharges ?? 0,
        poNumber: data.poNumber,
        note: data.note,
        subTotal: totals.subTotal,
        discountTotal: totals.discountTotal,
        taxAmount: totals.taxAmount,
        grandTotal: totals.grandTotal,
        items: {
          create: data.items.map((it) => {
            const { discountTotal, taxable, vatRate } = computeLine(it, data.vatRate ?? 0);
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

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("[POST /api/sales/orders] error", err);
    return NextResponse.json({ error: "บันทึกใบสั่งขายไม่สำเร็จ" }, { status: 500 });
  }
}

