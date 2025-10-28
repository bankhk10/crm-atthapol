import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const runtime = "nodejs";

export async function POST(_req: NextRequest, context: { params: Promise<{ quoteId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const perms = session?.user?.permissions;
    if (!hasPermission(perms, "sales", "edit")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์ส่งใบเสนอราคา" }, { status: 403 });
    }

    const { quoteId } = await context.params;
    const updated = await (prisma as any).quote.update({
      where: { id: quoteId },
      data: { status: "SENT" },
      select: { id: true, quoteNumber: true, status: true },
    });
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "ส่งใบเสนอราคาไม่สำเร็จ" }, { status: 400 });
  }
}

