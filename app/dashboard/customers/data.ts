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
  // Collect dealers
  const dealers = await prisma.dealer.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: ({
      id: true,
      prefix: true,
      firstName: true,
      lastName: true,
      contactPerson: true,
      contactPhone: true,
      contactEmail: true,
      name: true,
      phone: true,
      email: true,
      address: true,
      province: true,
      district: true,
      subdistrict: true,
      postalCode: true,
      createdAt: true,
    } as any),
  });

  const subDealers = await prisma.subDealer.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: ({
      id: true,
      prefix: true,
      firstName: true,
      lastName: true,
      contactPerson: true,
      contactPhone: true,
      contactEmail: true,
      name: true,
      phone: true,
      email: true,
      address: true,
      province: true,
      district: true,
      subdistrict: true,
      postalCode: true,
      createdAt: true,
    } as any),
  });

  const farmers = await prisma.farmer.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: ({
      id: true,
      prefix: true,
      firstName: true,
      lastName: true,
      contactPerson: true,
      contactPhone: true,
      contactEmail: true,
      name: true,
      phone: true,
      email: true,
      address: true,
      province: true,
      district: true,
      subdistrict: true,
      postalCode: true,
      createdAt: true,
    } as any),
  });

  const mapped: CustomerListItem[] = ([
    ...dealers.map((c) => ({
      id: c.id,
      type: "DEALER" as const,
      name: c.name,
      phone: c.phone ?? "",
      email: c.email ?? null,
      address: c.address ?? null,
      province: c.province ?? null,
      district: c.district ?? null,
      subdistrict: c.subdistrict ?? null,
      postalCode: c.postalCode ?? null,
      createdAt:
        (c as any)?.createdAt && typeof (c as any).createdAt?.toISOString === "function"
          ? (c as any).createdAt.toISOString()
          : String((c as any)?.createdAt ?? ""),
    })),
    ...subDealers.map((c) => ({
      id: c.id,
      type: "SUBDEALER" as const,
      name: c.name,
      phone: c.phone ?? "",
      email: c.email ?? null,
      address: c.address ?? null,
      province: c.province ?? null,
      district: c.district ?? null,
      subdistrict: c.subdistrict ?? null,
      postalCode: c.postalCode ?? null,
      createdAt:
        (c as any)?.createdAt && typeof (c as any).createdAt?.toISOString === "function"
          ? (c as any).createdAt.toISOString()
          : String((c as any)?.createdAt ?? ""),
    })),
    ...farmers.map((c) => ({
      id: c.id,
      type: "FARMER" as const,
      name: c.name,
      phone: c.phone ?? "",
      email: c.email ?? null,
      address: c.address ?? null,
      province: c.province ?? null,
      district: c.district ?? null,
      subdistrict: c.subdistrict ?? null,
      postalCode: c.postalCode ?? null,
      createdAt:
        (c as any)?.createdAt && typeof (c as any).createdAt?.toISOString === "function"
          ? (c as any).createdAt.toISOString()
          : String((c as any)?.createdAt ?? ""),
    })),
  ]) as any;

  // Sort by createdAt desc across union
  return mapped.sort((a, b) => (a.createdAt > b.createdAt ? -1 : a.createdAt < b.createdAt ? 1 : 0));
}

export async function getCustomer(customerId: string) {
  // Try Dealer
  const dealer = await prisma.dealer.findUnique({
    where: { id: customerId },
    include: { businessInfo: true },
  });
  if (dealer && !dealer.deletedAt) {
    return {
      id: dealer.id,
      type: "DEALER" as const,
      name: dealer.name,
      prefix: (dealer as any).prefix ?? null,
      firstName: (dealer as any).firstName ?? null,
      lastName: (dealer as any).lastName ?? null,
      birthDate: (dealer as any).birthDate ?? null,
      gender: (dealer as any).gender ?? null,
      age: (dealer as any).age ?? null,
      contactPerson: (dealer as any).contactPerson ?? null,
      contactPhone: (dealer as any).contactPhone ?? null,
      contactEmail: (dealer as any).contactEmail ?? null,
      phone: dealer.phone ?? "",
      email: dealer.email ?? null,
      taxId: dealer.taxId ?? null,
      address: dealer.address ?? null,
      province: dealer.province ?? null,
      district: dealer.district ?? null,
      subdistrict: dealer.subdistrict ?? null,
      postalCode: dealer.postalCode ?? null,
      latitude: dealer.latitude ?? null,
      longitude: dealer.longitude ?? null,
      // legacy placeholders removed; now persisted at top level
      code: (dealer as any).code ?? null,
      responsibleEmployeeId: dealer.responsibleEmployeeId ?? null,
      createdAt: dealer.createdAt,
      // extras expected in UI (use name as companyName, BusinessInfo.creditLimit)
      companyName: dealer.name,
      creditLimit: dealer.businessInfo?.creditLimit ?? null,
      averageMonthlyPurchase: (dealer as any).averageMonthlyPurchase ?? null,
      mainProducts: (dealer as any).mainProducts ?? null,
      brandsSold: (dealer as any).brandsSold ?? null,
      relationshipScore: (dealer as any).relationshipScore ?? null,
      businessNotes: (dealer as any).businessNotes ?? null,
    } as any;
  }

  // Try SubDealer
  const sub = await prisma.subDealer.findUnique({
    where: { id: customerId },
    include: { businessInfo: true, dealer: true },
  });
  if (sub && !sub.deletedAt) {
    return {
      id: sub.id,
      type: "SUBDEALER" as const,
      name: sub.name,
      prefix: (sub as any).prefix ?? null,
      firstName: (sub as any).firstName ?? null,
      lastName: (sub as any).lastName ?? null,
      birthDate: (sub as any).birthDate ?? null,
      gender: (sub as any).gender ?? null,
      age: (sub as any).age ?? null,
      contactPerson: (sub as any).contactPerson ?? null,
      contactPhone: (sub as any).contactPhone ?? null,
      contactEmail: (sub as any).contactEmail ?? null,
      phone: sub.phone ?? "",
      email: sub.email ?? null,
      taxId: sub.taxId ?? null,
      address: sub.address ?? null,
      province: sub.province ?? null,
      district: sub.district ?? null,
      subdistrict: sub.subdistrict ?? null,
      postalCode: sub.postalCode ?? null,
      latitude: sub.latitude ?? null,
      longitude: sub.longitude ?? null,
      code: (sub as any).code ?? null,
      responsibleEmployeeId: sub.responsibleEmployeeId ?? null,
      createdAt: sub.createdAt,
      // extras expected in UI
      companyName: sub.name,
      parentDealer: sub.dealer?.name ?? null,
      subDealerCode: (sub as any).code ?? null,
      dealerId: sub.dealerId ?? undefined,
      competitor: (sub as any).competitor ?? null,
      cropsInArea: (sub as any).cropsInArea ?? null,
      averageMonthlyPurchase: (sub as any).averageMonthlyPurchase ?? null,
      mainProducts: (sub as any).mainProducts ?? null,
      brandsSold: (sub as any).brandsSold ?? null,
      areaType: (sub as any).areaType ?? null,
      relationshipScore: (sub as any).relationshipScore ?? null,
      businessNotes: (sub as any).businessNotes ?? null,
    } as any;
  }

  // Try Farmer
  const farmer = await prisma.farmer.findUnique({
    where: { id: customerId },
  });
  if (farmer && !farmer.deletedAt) {
    return {
      id: farmer.id,
      type: "FARMER" as const,
      name: farmer.name,
      prefix: (farmer as any).prefix ?? null,
      firstName: (farmer as any).firstName ?? null,
      lastName: (farmer as any).lastName ?? null,
      contactPerson: (farmer as any).contactPerson ?? null,
      contactPhone: (farmer as any).contactPhone ?? null,
      contactEmail: (farmer as any).contactEmail ?? null,
      phone: farmer.phone ?? "",
      email: farmer.email ?? null,
      address: farmer.address ?? null,
      province: farmer.province ?? null,
      district: farmer.district ?? null,
      subdistrict: farmer.subdistrict ?? null,
      postalCode: farmer.postalCode ?? null,
      latitude: farmer.latitude ?? null,
      longitude: farmer.longitude ?? null,
      birthDate: farmer.birthDate ?? null,
      gender: farmer.gender ?? null,
      age: (farmer as any).age ?? null,
      code: (farmer as any).code ?? null,
      responsibleEmployeeId: farmer.responsibleEmployeeId ?? null,
      createdAt: farmer.createdAt,
      // extras
      farmName: farmer.farmName ?? null,
      farmSize: farmer.farmSize ?? null,
      cropType: farmer.cropType ?? null,
    } as any;
  }

  return null;
}

export async function getDealerOptions() {
  const dealers = await prisma.dealer.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });
  return dealers.map((d) => ({ id: d.id, label: d.code ? `${d.code} - ${d.name}` : d.name }));
}
