import { prisma } from "@/lib/prisma";
import type { CustomerWithDetails } from "./types";

export async function getDealers(): Promise<CustomerWithDetails[]> {
  const dealers = await prisma.customer.findMany({
    where: {
      customerType: "DEALER",
      status: "ACTIVE",
      deletedAt: null,
    },
    include: {
      dealerDetail: true,
    },
    orderBy: {
      companyName: "asc",
    },
  });

  // Map promotionBudgetLimit -> promotionBudget for any UI that still expects the
  // legacy `promotionBudget` field name. We keep other fields intact.
  const mapped = dealers.map((d) => {
    const dd = d.dealerDetail
      ? { ...d.dealerDetail, promotionBudget: (d.dealerDetail as any).promotionBudgetLimit }
      : null;
    return { ...d, dealerDetail: dd } as unknown as CustomerWithDetails;
  });

  return mapped;
}