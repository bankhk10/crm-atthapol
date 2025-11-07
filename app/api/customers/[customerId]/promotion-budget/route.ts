import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await ctx.params;
  try {
    // 1) Direct dealer (customer has DealerDetail)
    const dealer = await (prisma as any).dealerDetail.findUnique({
      where: { customerId },
      select: { promotionBudget: true },
    });
    if (dealer) {
      return NextResponse.json({
        promotionBudget: Number(dealer.promotionBudget ?? 0),
        promotionSupported: true,
      });
    }

    // 2) Sub-dealer: follow its dealerId → DealerDetail
    const subDealer = await (prisma as any).subDealerDetail.findUnique({
      where: { customerId },
      select: { dealerId: true },
    });
    if (subDealer?.dealerId) {
      const parentDealer = await (prisma as any).dealerDetail.findUnique({
        where: { id: subDealer.dealerId },
        select: { promotionBudget: true },
      });
      return NextResponse.json({
        promotionBudget: Number(parentDealer?.promotionBudget ?? 0),
        promotionSupported: true,
      });
    }

    // 3) Farmer: follow its dealerId → DealerDetail
    const farmer = await (prisma as any).farmerDetail.findUnique({
      where: { customerId },
      select: { dealerId: true },
    });
    if (farmer?.dealerId) {
      const parentDealer = await (prisma as any).dealerDetail.findUnique({
        where: { id: farmer.dealerId },
        select: { promotionBudget: true },
      });
      return NextResponse.json({
        promotionBudget: Number(parentDealer?.promotionBudget ?? 0),
        promotionSupported: true,
      });
    }

    // Default when no relation found
    return NextResponse.json({ promotionBudget: 0, promotionSupported: false });
  } catch {
    // Return 0 but keep 200 to avoid UI error states
    return NextResponse.json({ promotionBudget: 0, promotionSupported: false }, { status: 200 });
  }
}
