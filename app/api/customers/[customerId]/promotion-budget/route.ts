import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await ctx.params;
  try {
    const row = await (prisma as any).dealerDetail.findUnique({
      where: { customerId },
      select: { promotionBudget: true },
    });
    const promotionBudget = Number(row?.promotionBudget ?? 0);
    return NextResponse.json({ promotionBudget });
  } catch (err) {
    return NextResponse.json({ promotionBudget: 0 }, { status: 200 });
  }
}

