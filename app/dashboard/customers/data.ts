import { prisma } from "@/lib/prisma";
import { resolveEffectiveDealerWith } from "@/lib/customer-dealer";

export type CustomerListItem = {
  id: string;
  type: "DEALER" | "SUBDEALER" | "FARMER" | "BROKER";
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  province?: string | null;
  district?: string | null;
  subdistrict?: string | null;
  postalCode?: string | null;
  createdAt: string;
  branches: Array<{
    id: string; // Customer ID ของร้านรอง
    name: string;
    phone: string | null;
  }>;
};

const displayName = (c: {
  companyName: string | null;
  prefix: string | null;
  firstName: string | null;
  lastName: string | null;
}) =>
  c.companyName && c.companyName.trim().length > 0
    ? c.companyName
    : [c.prefix, c.firstName, c.lastName].filter(Boolean).join(" ");

export async function getCustomers(): Promise<CustomerListItem[]> {
  const customers = await (prisma as any).customer.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      customerType: true,
      companyName: true,
      prefix: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      address: true,
      province: true,
      district: true,
      subdistrict: true,
      postalCode: true,
      createdAt: true,
      dealerDetail: {
        select: {
          branches: {
            where: { customer: { deletedAt: null } },
            select: {
              customer: {
                select: {
                  id: true,
                  companyName: true,
                  prefix: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const mapped: CustomerListItem[] = (customers as any[]).map((c: any) => ({
    id: c.id,
    type:
      c.customerType === "DEALER"
        ? ("DEALER" as const)
        : c.customerType === "SUB_DEALER"
          ? ("SUBDEALER" as const)
          : c.customerType === "BROKER"
            ? ("BROKER" as const)
            : ("FARMER" as const),
    name: displayName({
      companyName: c.companyName ?? null,
      prefix: c.prefix ?? null,
      firstName: c.firstName ?? null,
      lastName: c.lastName ?? null,
    }),
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
    branches: (c.dealerDetail?.branches ?? []).map((b: any) => ({
      id: b.customer.id, // Customer ID ของร้านรอง
      name: displayName({
        companyName: b.customer.companyName ?? null,
        prefix: b.customer.prefix ?? null,
        firstName: b.customer.firstName ?? null,
        lastName: b.customer.lastName ?? null,
      }),
      phone: b.customer.phone ?? null,
    })),
  }));

  return mapped;
}

export async function getCustomer(customerId: string) {
  const c = await (prisma as any).customer.findUnique({
    where: { id: customerId },
    include: {
      dealerDetail: true,
      subDealerDetail: { include: { dealer: { include: { customer: true } } } },
      farmerDetail: {
        include: {
          dealer: { include: { customer: true } },
          farmPlots: { where: { deletedAt: null } },
        },
      },
      brokerDetail: true,
    },
  });
  if (!c || c.deletedAt) return null;

  const type =
    c.customerType === "DEALER"
      ? ("DEALER" as const)
      : c.customerType === "SUB_DEALER"
        ? ("SUBDEALER" as const)
        : c.customerType === "BROKER"
          ? ("BROKER" as const)
          : ("FARMER" as const);

  const base = {
    id: c.id,
    type,
    name: displayName({
      companyName: c.companyName ?? null,
      prefix: c.prefix ?? null,
      firstName: c.firstName ?? null,
      lastName: c.lastName ?? null,
    }),
    prefix: c.prefix ?? null,
    firstName: c.firstName ?? null,
    lastName: c.lastName ?? null,
    birthDate: c.birthDate ?? null,
    gender: c.gender ?? null,
    age: c.age ?? null,
    phone: c.phone ?? "",
    email: c.email ?? null,
    taxId: c.taxId ?? null,
    address: c.address ?? null,
    province: c.province ?? null,
    district: c.district ?? null,
    subdistrict: c.subdistrict ?? null,
    postalCode: c.postalCode ?? null,
    latitude:
      c.customerType === "FARMER"
        ? (c.farmerDetail?.latitude ?? null)
        : c.customerType === "DEALER"
          ? ((c as any).dealerDetail?.latitude ?? null)
          : c.customerType === "SUB_DEALER"
            ? ((c as any).subDealerDetail?.latitude ?? null)
            : null,
    longitude:
      c.customerType === "FARMER"
        ? (c.farmerDetail?.longitude ?? null)
        : c.customerType === "DEALER"
          ? ((c as any).dealerDetail?.longitude ?? null)
          : c.customerType === "SUB_DEALER"
            ? ((c as any).subDealerDetail?.longitude ?? null)
            : null,
    code: null as any,
    responsibleEmployeeId: c.responsibleEmployeeId ?? null,
    createdAt: c.createdAt,
  } as any;

  if (type === "DEALER") {
    // If this dealer is a branch, show the main dealer's credit/promotion values
    const eff = await resolveEffectiveDealerWith(prisma, customerId);
    return {
      ...base,
      companyName: c.companyName ?? base.name,
      contactPerson: c.dealerDetail?.contactName ?? base.name,
      contactPhone: c.dealerDetail?.contactPhone ?? null,
      contactEmail: (c as any).dealerDetail?.contactEmail ?? null,
      creditLimit: eff?.creditLimit ?? c.dealerDetail?.creditLimit ?? null,
      promotionBudget: eff?.promotionBudget ?? (c as any)?.dealerDetail?.promotionBudget ?? null,
      relationshipScore: (c as any)?.relationshipScore ?? null,
      averageMonthlyPurchase: null,
      mainProducts: null,
      brandsSold: null,
      businessNotes: (c as any)?.dealerDetail?.businessNotes ?? null,
      parentDealer: c.dealerDetail?.parentDealerId ?? null,
      dealerDetailId: c.dealerDetail?.id ?? null,
    } as any;
  }

  if (type === "SUBDEALER") {
    const parentDealerName = c.subDealerDetail?.dealer?.customer
      ? displayName({
          companyName: c.subDealerDetail.dealer.customer.companyName ?? null,
          prefix: c.subDealerDetail.dealer.customer.prefix ?? null,
          firstName: c.subDealerDetail.dealer.customer.firstName ?? null,
          lastName: c.subDealerDetail.dealer.customer.lastName ?? null,
        })
      : null;
    return {
      ...base,
      companyName: c.companyName ?? base.name,
      parentDealer: parentDealerName,
      subDealerCode: "",
      dealerId: c.subDealerDetail?.dealerId ?? undefined,
      relationshipScore: (c as any)?.relationshipScore ?? null,
      contactPhone: (c as any).subDealerDetail?.contactPhone ?? null,
      contactEmail: (c as any).subDealerDetail?.contactEmail ?? null,
      competitor: (c as any).subDealerDetail?.competitor ?? null,
      cropsInArea: (c as any).subDealerDetail?.cropsInArea ?? null,
      averageMonthlyPurchase: (c as any).subDealerDetail?.averageMonthlyPurchase ?? null,
      mainProducts: (c as any).subDealerDetail?.mainProducts ?? null,
      brandsSold: (c as any).subDealerDetail?.brandsSold ?? null,
      areaType: (c as any).subDealerDetail?.areaType ?? null,
      businessNotes: (c as any).subDealerDetail?.businessNotes ?? null,
    } as any;
  }

  if (type === "BROKER") {
    return {
      ...base,
      // Broker fields
      farmName: null,
      farmSize: (c as any).brokerDetail?.areaSize ?? null,
      cropType: (c as any).brokerDetail?.cropTypes ?? null,
      currentCropVolume: (c as any).brokerDetail?.currentCropVolume ?? null,
      farmerNetworkCount: (c as any).brokerDetail?.farmerNetworkCount ?? null,
      plotCount: (c as any).brokerDetail?.plotCount ?? null,
      plantingCyclesPerYear: (c as any).brokerDetail?.plantingCyclesPerYear ?? null,
      creditTermForFarmers: (c as any).brokerDetail?.creditTermForFarmers ?? null,
      agriChemValuePerCycle: (c as any).brokerDetail?.agriChemValuePerCycle ?? null,
      agriChemQtyPerCycle: (c as any).brokerDetail?.agriChemQtyPerCycle ?? null,
      regularStore: (c as any).brokerDetail?.regularStore ?? null,
      serviceTypes: (c as any).brokerDetail?.serviceTypes ?? null,
      brandsUsed: (c as any).brokerDetail?.brandsUsed ?? null,
      // No farm plots for broker
      farmPlots: [],
    } as any;
  }

  // FARMER
  return {
    ...base,
    farmName: null,
    farmSize: c.farmerDetail?.areaSize ?? null,
    cropType: c.farmerDetail?.cropType ?? null,
    farmPlots:
      c.farmerDetail?.farmPlots?.map((p: any) => ({
        id: p.id,
        latitude: p.latitude ?? undefined,
        longitude: p.longitude ?? undefined,
        planting_area: p.plantingArea ?? undefined,
        crop_type: p.cropType ?? undefined,
        crop_variety: p.cropVariety ?? undefined,
        soil_type: p.soilType ?? undefined,
        water_source: p.waterSource ?? undefined,
        machinery_used: Array.isArray(p.machineryUsed) ? p.machineryUsed : [],
      })) ?? [],
  } as any;
}

export async function getDealerOptions() {
  const rows = await (prisma as any).dealerDetail.findMany({
    where: { deletedAt: null, customer: { deletedAt: null } },
    orderBy: { createdAt: "asc" },
    include: { customer: true },
  });
  return (rows as any[]).map((d: any) => ({
    id: d.id,
    label: displayName({
      companyName: d.customer.companyName ?? null,
      prefix: d.customer.prefix ?? null,
      firstName: d.customer.firstName ?? null,
      lastName: d.customer.lastName ?? null,
    }),
  }));
}
