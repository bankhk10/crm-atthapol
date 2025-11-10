import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { resolveEffectiveDealer } from "@/lib/customer-dealer";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await ctx.params;
  try {
    // Resolve effective dealer (main dealer) for the customer and return its promotionBudget
    const effDealer = await resolveEffectiveDealer(customerId);
    if (effDealer?.id) {
      return NextResponse.json({
        promotionBudget: Number(effDealer.promotionBudget ?? 0),
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
