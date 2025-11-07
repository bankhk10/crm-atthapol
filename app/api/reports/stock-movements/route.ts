import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(200, Math.max(1, Number(searchParams.get("pageSize") || 50)));
    const skip = (page - 1) * pageSize;

    const productId = searchParams.get("productId") || undefined;
    const typeParam = searchParams.getAll("type");
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    const saleOrderId = searchParams.get("saleOrderId") || undefined;

    // Normalize movement types (supports repeated or comma-separated)
    let types: string[] | undefined = undefined;
    if (typeParam && typeParam.length > 0) {
      const parts: string[] = [];
      for (const p of typeParam) {
        if (!p) continue;
        const segs = String(p)
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean);
        parts.push(...segs);
      }
      if (parts.length > 0) types = Array.from(new Set(parts));
    }

    const where: any = {};
    if (productId) where.productId = productId;
    if (saleOrderId) where.saleOrderId = saleOrderId;
    if (types && types.length > 0) where.type = { in: types as any };

    if (from || to) {
      const range: any = {};
      if (from) {
        const d = new Date(from);
        if (!isNaN(d.getTime())) range.gte = d;
      }
      if (to) {
        const d = new Date(to);
        if (!isNaN(d.getTime())) range.lte = d;
      }
      if (Object.keys(range).length > 0) where.createdAt = range;
    }

    const [items, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          product: { select: { id: true, productCode: true, nameTH: true, unit: true } },
          stock: { select: { lotNumber: true, mfgDate: true, expDate: true } },
          saleOrder: { select: { id: true, soNumber: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.stockMovement.count({ where }),
    ]);

    return NextResponse.json({ items, total, page, pageSize });
  } catch (err) {
    console.error("[GET /api/reports/stock-movements] error", err);
    return NextResponse.json({ error: "ไม่สามารถดึงรายงานได้" }, { status: 500 });
  }
}
