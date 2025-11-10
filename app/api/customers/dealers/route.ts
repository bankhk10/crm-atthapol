import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";

export async function GET(request: NextRequest) {
  await requirePermission("customers", "view");

  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") || "1");
  const pageSize = Number(url.searchParams.get("pageSize") || "10");
  const q = (url.searchParams.get("q") || "").trim();

  const where: any = {
    customerType: "DEALER",
    status: "ACTIVE",
    deletedAt: null,
    dealerDetail: {
      is: {
        parentDealerId: null,
      },
    },
  };

  if (q) {
    where.OR = [
      { companyName: { contains: q, mode: "insensitive" } },
      { dealerDetail: { is: { contactName: { contains: q, mode: "insensitive" } } } },
    ];
  }

  const total = await prisma.customer.count({ where });
  const items = await prisma.customer.findMany({
    where,
    include: { dealerDetail: true },
    orderBy: { companyName: "asc" },
    skip: (Math.max(1, page) - 1) * pageSize,
    take: pageSize,
  });

  return NextResponse.json({ items, total });
}
