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

const UpdateSchema = z.object({
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

type UpdateInput = z.infer<typeof UpdateSchema>;

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

function computeTotals(payload: UpdateInput) {
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

export async function GET(_req: NextRequest, context: { params: Promise<{ quoteId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const perms = session?.user?.permissions;
    if (!hasPermission(perms, "sales", "view")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึงใบเสนอราคา" }, { status: 403 });
    }

    const { quoteId } = await context.params;
    const q = await (prisma as any).quote.findUnique({
      where: { id: quoteId },
      include: { items: true, customer: true, salesperson: true },
    });
    if (!q) return NextResponse.json({ error: "ไม่พบข้อมูล" }, { status: 404 });
    return NextResponse.json(q);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "โหลดข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ quoteId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const perms = session?.user?.permissions;
    if (!hasPermission(perms, "sales", "edit")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์แก้ไขใบเสนอราคา" }, { status: 403 });
    }
    const { quoteId } = await context.params;
    const json = await req.json();
    const payload = UpdateSchema.parse(json);
    const totals = computeTotals(payload);

    const updated = await (prisma as any).$transaction(async (tx: any) => {
      await (tx as any).quote.update({
        where: { id: quoteId },
        data: {
          customerId: payload.customerId,
          salespersonId: payload.salespersonId || undefined,
          quoteDate: payload.quoteDate ? new Date(payload.quoteDate) : undefined,
          validUntil: payload.validUntil ? new Date(payload.validUntil) : null,
          paymentCondition: (payload.paymentCondition as any) ?? undefined,
          creditTermDays: payload.creditTermDays ?? null,
          currency: payload.currency,
          vatIncluded: payload.vatIncluded,
          vatRate: payload.vatRate,
          shippingMethod: payload.shippingMethod || undefined,
          note: payload.note || undefined,
          status: (payload.status as any) ?? undefined,
          subTotal: totals.subTotal,
          discountTotal: totals.discountTotal,
          orderDiscount: Number(payload.orderDiscount ?? 0),
          taxAmount: totals.taxAmount,
          shippingFee: Number(payload.shippingFee ?? 0),
          otherCharges: Number(payload.otherCharges ?? 0),
          grandTotal: totals.grandTotal,
        },
      });

      await (tx as any).quoteItem.deleteMany({ where: { quoteId } });
      await (tx as any).quoteItem.createMany({
        data: payload.items.map((it) => ({
          quoteId,
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
      });

      return (tx as any).quote.findUnique({ where: { id: quoteId }, select: { id: true, quoteNumber: true } });
    });

    return NextResponse.json(updated);
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

