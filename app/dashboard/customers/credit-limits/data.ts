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

  return dealers;
}