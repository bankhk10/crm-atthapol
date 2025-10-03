import { prisma } from "@/lib/prisma";

export type CustomerListItem = {
  id: string;
  type: "DEALER" | "SUBDEALER" | "FARMER";
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  province?: string | null;
  district?: string | null;
  subdistrict?: string | null;
  postalCode?: string | null;
  createdAt: string;
};

export async function getCustomers(): Promise<CustomerListItem[]> {
  const db = prisma as any;
  const customers = await db.customer.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
  });

  return customers.map((c: any) => ({
    id: c.id,
    type: c.type,
    name: c.name,
    phone: c.phone,
    email: c.email ?? null,
    address: c.address ?? null,
    province: c.province ?? null,
    district: c.district ?? null,
    subdistrict: c.subdistrict ?? null,
    postalCode: c.postalCode ?? null,
    createdAt: new Date(c.createdAt).toISOString(),
  }));
}

export async function getCustomer(customerId: string) {
  const db = prisma as any;
  const c = await db.customer.findUnique({ where: { id: customerId } });
  if (!c || c.deletedAt) return null;
  return c as any;
}
