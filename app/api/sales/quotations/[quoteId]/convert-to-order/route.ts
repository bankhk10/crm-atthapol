import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const runtime = "nodejs";

function computeLine(it: any, defaultVatRate: number) {
  const base = Number(it.qty || 0) * Number(it.unitPrice || 0);
  const discA = Math.max(0, Number(it.discountAmount || 0));
  const discP = Math.max(0, Number(it.discountPercent || 0));
  const discFromPct = base * (discP / 100);
  const discountTotal = Math.min(base, discA + discFromPct);
  const taxable = Math.max(0, base - discountTotal);
  const vatRate = defaultVatRate;
  return { base, discountTotal, taxable, vatRate };
}

function computeTotals(q: any) {
  const vatRate = Number(q.vatRate || 0);
  let subTotal = 0;
  let discountTotal = 0;
  let taxAmount = 0;
  for (const it of q.items || []) {
    const { discountTotal: d, taxable, vatRate: lineVat } = computeLine(it, vatRate);
    subTotal += taxable;
    discountTotal += d;
    taxAmount += taxable * (lineVat / 100);
  }
  const shipping = Number(q.shippingFee || 0);
  const others = Number(q.otherCharges || 0);
  const od = Math.max(0, Number(q.orderDiscount || 0));
  const grandTotal = Math.max(0, subTotal + taxAmount + shipping + others - od);
  return { subTotal, discountTotal, taxAmount, grandTotal };
}

async function generateSoNumberTx(tx: any) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `SO-${y}${m}-`;
  const row = await (tx as any).docSequence.upsert({
    where: { prefix },
    create: { prefix, current: 1 },
    update: { current: { increment: 1 } },
    select: { current: true },
  });
  const seq = String(row.current).padStart(6, "0");
  return `${prefix}${seq}`;
}

export async function POST(_req: NextRequest, context: { params: Promise<{ quoteId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const perms = session?.user?.permissions;
    if (!hasPermission(perms, "sales", "create")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์สร้างใบสั่งขาย" }, { status: 403 });
    }
    const { quoteId } = await context.params;

    const result = await (prisma as any).$transaction(async (tx: any) => {
      const q = await (tx as any).quote.findUnique({ where: { id: quoteId }, include: { items: true } });
      if (!q) throw new Error("ไม่พบใบเสนอราคา");

      const totals = computeTotals(q);
      const orderDate = new Date();
      let dueDate: Date | null = null;
      if (q.paymentCondition === "POSTPAID" && typeof q.creditTermDays === "number") {
        dueDate = new Date(orderDate);
        dueDate.setDate(dueDate.getDate() + Number(q.creditTermDays));
      }

      const so = await (tx as any).saleOrder.create({
        data: {
          soNumber: await generateSoNumberTx(tx),
          customerId: q.customerId,
          salespersonId: q.salespersonId || undefined,
          orderDate,
          dueDate: dueDate || undefined,
          creditTermDays: q.creditTermDays || undefined,
          paymentCondition: (q.paymentCondition as any) ?? "PREPAID",
          currency: q.currency,
          vatIncluded: q.vatIncluded,
          vatRate: Number(q.vatRate || 0),
          billTo: undefined,
          shipTo: undefined,
          status: "CONFIRMED",
          paymentStatus: "UNPAID",
          subTotal: totals.subTotal,
          discountTotal: totals.discountTotal,
          orderDiscount: Number(q.orderDiscount || 0),
          taxAmount: totals.taxAmount,
          shippingFee: Number(q.shippingFee || 0),
          otherCharges: Number(q.otherCharges || 0),
          grandTotal: totals.grandTotal,
          note: q.note ? `สร้างจากใบเสนอราคา ${q.quoteNumber}: ${q.note}` : `สร้างจากใบเสนอราคา ${q.quoteNumber}`,
          items: {
            create: (q.items || []).map((it: any) => ({
              productId: it.productId || undefined,
              productCodeSnapshot: it.productCodeSnapshot || undefined,
              nameSnapshot: it.nameSnapshot || "",
              unit: it.unit || undefined,
              qty: Number(it.qty || 0),
              unitPrice: Number(it.unitPrice || 0),
              discountPercent: Number(it.discountPercent || 0),
              discountAmount: Number(it.discountAmount || 0),
              amount: Math.max(0, Number(it.qty || 0) * Number(it.unitPrice || 0) - Number(it.discountAmount || 0) - Math.max(0, Number(it.discountPercent || 0) / 100 * (Number(it.qty || 0) * Number(it.unitPrice || 0)))),
            })),
          },
        },
        select: { id: true, soNumber: true },
      });

      await (tx as any).quote.update({ where: { id: q.id }, data: { status: "ACCEPTED" } });
      return so;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "แปลงเป็นใบสั่งขายไม่สำเร็จ" }, { status: 400 });
  }
}

