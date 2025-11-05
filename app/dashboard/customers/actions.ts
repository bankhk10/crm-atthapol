"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { runWithRequestContext } from "@/lib/request-context";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

import type { CustomerFormValues } from "./types";
const farmPlotSchema = z.object({
  id: z.string().optional(),
  latitude: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : typeof v === "string" ? parseFloat(v) : v),
    z.number().optional(),
  ),
  longitude: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : typeof v === "string" ? parseFloat(v) : v),
    z.number().optional(),
  ),
  planting_area: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : typeof v === "string" ? parseFloat(v) : v),
    z.number().optional(),
  ),
  crop_type: z.string().optional(),
  crop_variety: z.string().optional(),
  soil_type: z.string().optional(),
  water_source: z.string().optional(),
  machinery_used: z.array(z.string()).optional(),
});

const customerFormSchema = z.object({
  type: z.enum(["DEALER", "SUBDEALER", "FARMER", "BROKER"]),
  prefix: z.string().min(1, "กรุณาเลือกคำนำหน้า"),
  firstName: z.string().min(1, "กรุณากรอกชื่อ"),
  lastName: z.string().min(1, "กรุณากรอกนามสกุล"),
  gender: z.enum(["MALE", "FEMALE"], { message: "เพศไม่ถูกต้อง" }),
  birthDate: z.string().min(1, "กรุณาเลือกวันเกิด"),
  age: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : typeof v === "string" ? parseInt(v, 10) : v),
    z.number().int().positive().optional(),
  ),
  // บริษัท (เก็บที่ top-level)
  phone: z.string().optional().or(z.literal("")).transform((v) => (v == null ? "" : String(v))),
  code: z.string().optional(),
  email: z
    .string()
    .email("อีเมลไม่ถูกต้อง")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  taxId: z.string().optional(),
  address: z.string().optional(),
  province: z.string().optional(),
  district: z.string().optional(),
  subdistrict: z.string().optional(),
  postalCode: z.coerce.string().optional(),
  latitude: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : typeof v === "string" ? parseFloat(v) : v),
    z.number().optional(),
  ),
  longitude: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : typeof v === "string" ? parseFloat(v) : v),
    z.number().optional(),
  ),

  // ฟิลด์ที่เคยอยู่ใน profile JSON
  companyName: z.string().optional(),
  contactPerson: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email("อีเมลไม่ถูกต้อง").optional().or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  creditLimit: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : typeof v === "string" ? parseFloat(v) : v),
    z.number().optional(),
  ),
  promotionBudget: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : typeof v === "string" ? parseFloat(v) : v),
    z.number().optional(),
  ),

  // SubDealer extras
  dealerId: z.string().optional(),
  competitor: z.string().optional(),
  cropsInArea: z.string().optional(),
  averageMonthlyPurchase: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : typeof v === "string" ? parseFloat(v) : v),
    z.number().optional(),
  ),
  mainProducts: z.string().optional(),
  brandsSold: z.string().optional(),
  areaType: z.string().optional(),
  relationshipScore: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : typeof v === "string" ? parseInt(v, 10) : v),
    z.number().int().min(1).max(5).optional(),
  ),
  businessNotes: z.string().optional(),

  parentDealer: z.string().optional(),
  subDealerCode: z.string().optional(),

  farmName: z.string().optional(),
  farmSize: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : typeof v === "string" ? parseFloat(v) : v),
    z.number().optional(),
  ),
  cropType: z.string().optional(),

  responsibleEmployeeId: z.string().optional().or(z.null()),
  farmPlots: z.array(farmPlotSchema).optional(),

  // Broker-only
  currentCropVolume: z.string().optional(),
  farmerNetworkCount: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : typeof v === "string" ? parseInt(v, 10) : v),
    z.number().int().optional(),
  ),
  plotCount: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : typeof v === "string" ? parseInt(v, 10) : v),
    z.number().int().optional(),
  ),
  plantingCyclesPerYear: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : typeof v === "string" ? parseInt(v, 10) : v),
    z.number().int().optional(),
  ),
  creditTermForFarmers: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : typeof v === "string" ? parseInt(v, 10) : v),
    z.number().int().optional(),
  ),
  agriChemValuePerCycle: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : typeof v === "string" ? parseFloat(v) : v),
    z.number().optional(),
  ),
  agriChemQtyPerCycle: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : typeof v === "string" ? parseFloat(v) : v),
    z.number().optional(),
  ),
  regularStore: z.string().optional(),
  serviceTypes: z.string().optional(),
  brandsUsed: z.string().optional(),
}).superRefine((val, ctx) => {
  const phone = (val.phone ?? "").trim();
  const cphone = (val.contactPhone ?? "").trim();
  // DEALER/SUBDEALER: ต้องมี phone (บริษัท)
  if (val.type === "DEALER" || val.type === "SUBDEALER") {
    if (!phone) {
      ctx.addIssue({ code: "custom", path: ["phone"], message: "กรุณากรอกเบอร์โทร" });
    }
  }
  // FARMER/BROKER: ต้องมีอย่างน้อย 1 ค่า ระหว่าง phone หรือ contactPhone
  if (val.type === "FARMER" || val.type === "BROKER") {
    if (!phone && !cphone) {
      ctx.addIssue({ code: "custom", path: ["contactPhone"], message: "กรุณากรอกเบอร์โทร (บุคคล)" });
    }
  }
});

function computeAgeFromBirthDate(birthDate?: string | null) {
  if (!birthDate) return undefined;
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 ? age : undefined;
}

async function generateCode(tx: Prisma.TransactionClient, model: "dealer" | "subDealer" | "farmer") {
  const prefix = model === "dealer" ? "DLR-" : model === "subDealer" ? "SBD-" : "FRM-";
  const last = await (tx as any)[model].findFirst({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { code: true },
  });
  const lastNumber = last ? Number.parseInt(String(last.code).replace(/\D/g, ""), 10) : 0;
  const nextNumber = Number.isFinite(lastNumber) ? lastNumber + 1 : 1;
  return `${prefix}${nextNumber.toString().padStart(4, "0")}`;
}

export async function createCustomer(rawValues: CustomerFormValues) {
  const parsed = customerFormSchema.safeParse(rawValues);
  if (!parsed.success) {
    const fieldErrors = Object.create(null) as Record<string, string>;
    for (const iss of parsed.error.issues) {
      const key = Array.isArray(iss.path) && iss.path.length ? String(iss.path[0]) : "_";
      if (!fieldErrors[key]) fieldErrors[key] = iss.message || "ข้อมูลไม่ถูกต้อง";
    }
    throw new Error(JSON.stringify({ code: "VALIDATION_ERROR", fieldErrors }));
  }
  const values = parsed.data;
  const session = await getServerSession(authOptions);

  // Permission check: type-specific (or ALL types) only
  const perms = session?.user?.permissions ?? [];
  const t = values.type;
  const typeKey = t === "DEALER" ? "dealer" : t === "SUBDEALER" ? "subdealer" : t === "FARMER" ? "farmer" : "broker";
  const allowAny = perms.includes("customers_create:all");
  const allowType = perms.includes(`customers_create:${typeKey}`);
  if (!allowAny && !allowType) {
    throw new Error("คุณไม่มีสิทธิ์สร้างลูกค้าประเภทนี้");
  }

  await runWithRequestContext({ userId: session?.user?.id }, async () => {
    await prisma.$transaction(async (tx) => {
      // Normalize name, phone, email for farmer
      const displayName =
        (values.companyName && String(values.companyName).trim()) ||
        [values.prefix, values.firstName, values.lastName].filter(Boolean).join(" ");
      const normalizedPhone =
        values.type === "FARMER" || values.type === "BROKER"
          ? (values.phone || values.contactPhone || "")
          : values.phone;
      const normalizedEmail =
        values.type === "FARMER" || values.type === "BROKER"
          ? (values.email || values.contactEmail)
          : values.email;

      const created = await (tx as any).customer.create({
        data: {
          responsibleEmployeeId: values.responsibleEmployeeId ?? undefined,
          customerType:
            values.type === "DEALER"
              ? ("DEALER" as any)
              : values.type === "SUBDEALER"
              ? ("SUB_DEALER" as any)
              : values.type === "FARMER"
              ? ("FARMER" as any)
              : ("BROKER" as any),
          prefix: values.prefix,
          firstName: values.firstName,
          lastName: values.lastName,
          phone: normalizedPhone,
          email: normalizedEmail,
          birthDate: values.birthDate ? new Date(values.birthDate) : null,
          gender: values.gender as any,
          age: computeAgeFromBirthDate(values.birthDate) ?? (values.age as number | undefined),
          companyName: values.companyName,
          taxId: values.taxId,
          address: values.address,
          province: values.province,
          district: values.district,
          subdistrict: values.subdistrict,
          postalCode: values.postalCode,
          relationshipScore: values.relationshipScore ?? undefined,
        },
      });

      if (values.type === "DEALER") {
        await (tx as any).dealerDetail.create({
          data: {
            customerId: created.id,
            contactName:
              values.contactPerson && values.contactPerson.trim().length
                ? values.contactPerson
                : [values.prefix, values.firstName, values.lastName].filter(Boolean).join(" "),
            contactPhone: values.contactPhone,
            contactEmail: values.contactEmail ?? undefined,
            latitude:
              values.latitude !== undefined && values.latitude !== null && String(values.latitude) !== ""
                ? Number(values.latitude)
                : undefined,
            longitude:
              values.longitude !== undefined && values.longitude !== null && String(values.longitude) !== ""
                ? Number(values.longitude)
                : undefined,
            businessNotes: values.businessNotes ?? undefined,
            creditLimit:
              values.creditLimit !== undefined && values.creditLimit !== null && String(values.creditLimit) !== ""
                ? Number(values.creditLimit)
                : undefined,
            promotionBudget:
              values.promotionBudget !== undefined && values.promotionBudget !== null && String(values.promotionBudget) !== ""
                ? Number(values.promotionBudget)
                : undefined,
          },
        });
      } else if (values.type === "SUBDEALER") {
        await (tx as any).subDealerDetail.create({
          data: {
            customerId: created.id,
            dealerId: values.dealerId ?? undefined,
            contactPhone: values.contactPhone ?? undefined,
            contactEmail: values.contactEmail ?? undefined,
            latitude:
              values.latitude !== undefined && values.latitude !== null && String(values.latitude) !== ""
                ? Number(values.latitude)
                : undefined,
            longitude:
              values.longitude !== undefined && values.longitude !== null && String(values.longitude) !== ""
                ? Number(values.longitude)
                : undefined,
            competitor: values.competitor ?? undefined,
            cropsInArea: values.cropsInArea ?? undefined,
            averageMonthlyPurchase:
              values.averageMonthlyPurchase !== undefined && values.averageMonthlyPurchase !== null && String(values.averageMonthlyPurchase) !== ""
                ? Number(values.averageMonthlyPurchase)
                : undefined,
            mainProducts: values.mainProducts ?? undefined,
            brandsSold: values.brandsSold ?? undefined,
            areaType: values.areaType ?? undefined,
            businessNotes: values.businessNotes ?? undefined,
          },
        });
      } else if (values.type === "FARMER") {
        const plots = values.farmPlots ?? [];
        const areaSum = plots.reduce((sum, p) => sum + (Number(p.planting_area) || 0), 0);
        const first = plots[0];
        const fd = await (tx as any).farmerDetail.create({
          data: {
            customerId: created.id,
            dealerId: values.dealerId ?? undefined,
            areaSize: areaSum || (values.farmSize !== undefined && values.farmSize !== null && String(values.farmSize) !== "" ? Number(values.farmSize) : undefined),
            cropType: first?.crop_type || (values.cropType ? String(values.cropType) : undefined),
            cultivar: first?.crop_variety || undefined,
            latitude: first?.latitude ?? (values.latitude !== undefined && values.latitude !== null && String(values.latitude) !== "" ? Number(values.latitude) : undefined),
            longitude: first?.longitude ?? (values.longitude !== undefined && values.longitude !== null && String(values.longitude) !== "" ? Number(values.longitude) : undefined),
          },
        });
        if (plots.length) {
          await (tx as any).farmPlot.createMany({
            data: plots.map((p: any) => ({
              farmerDetailId: fd.id,
              latitude: p.latitude !== undefined && p.latitude !== null && String(p.latitude) !== "" ? Number(p.latitude) : undefined,
              longitude: p.longitude !== undefined && p.longitude !== null && String(p.longitude) !== "" ? Number(p.longitude) : undefined,
              plantingArea: p.planting_area !== undefined && p.planting_area !== null && String(p.planting_area) !== "" ? Number(p.planting_area) : undefined,
              cropType: p.crop_type || undefined,
              cropVariety: p.crop_variety || undefined,
              soilType: p.soil_type || undefined,
              waterSource: p.water_source || undefined,
              machineryUsed: Array.isArray(p.machinery_used) ? p.machinery_used : undefined,
            })),
            skipDuplicates: true,
          });
        }
      } else if (values.type === "BROKER") {
        // Create broker detail with full set of fields
        await (tx as any).brokerDetail.create({
          data: {
            customerId: created.id,
            cropTypes: values.cropType ? String(values.cropType) : undefined,
            currentCropVolume: values.currentCropVolume ?? undefined,
            farmerNetworkCount: values.farmerNetworkCount ?? undefined,
            plotCount: values.plotCount ?? undefined,
            areaSize:
              values.farmSize !== undefined && values.farmSize !== null && String(values.farmSize) !== ""
                ? Number(values.farmSize)
                : undefined,
            plantingCyclesPerYear: values.plantingCyclesPerYear ?? undefined,
            creditTermForFarmers: values.creditTermForFarmers ?? undefined,
            agriChemValuePerCycle: values.agriChemValuePerCycle ?? undefined,
            agriChemQtyPerCycle: values.agriChemQtyPerCycle ?? undefined,
            regularStore: values.regularStore ?? undefined,
            serviceTypes: values.serviceTypes ?? undefined,
            brandsUsed: values.brandsUsed ?? undefined,
          },
        });
      }

      return created.id;
    });
  });

  revalidatePath("/dashboard/customers");
}

export async function updateCustomer(customerId: string, rawValues: CustomerFormValues) {
  const parsed = customerFormSchema.safeParse(rawValues);
  if (!parsed.success) {
    const fieldErrors = Object.create(null) as Record<string, string>;
    for (const iss of parsed.error.issues) {
      const key = Array.isArray(iss.path) && iss.path.length ? String(iss.path[0]) : "_";
      if (!fieldErrors[key]) fieldErrors[key] = iss.message || "ข้อมูลไม่ถูกต้อง";
    }
    throw new Error(JSON.stringify({ code: "VALIDATION_ERROR", fieldErrors }));
  }
  const values = parsed.data;
  const session = await getServerSession(authOptions);

  await runWithRequestContext({ userId: session?.user?.id }, async () => {
    await prisma.$transaction(async (tx) => {
      const normalizedPhone =
        values.type === "FARMER" || values.type === "BROKER"
          ? (values.phone || values.contactPhone || "")
          : values.phone;
      const normalizedEmail =
        values.type === "FARMER" || values.type === "BROKER"
          ? (values.email || values.contactEmail)
          : values.email;

      await (tx as any).customer.update({
        where: { id: customerId },
        data: {
          customerType:
            values.type === "DEALER"
              ? ("DEALER" as any)
              : values.type === "SUBDEALER"
              ? ("SUB_DEALER" as any)
              : values.type === "FARMER"
              ? ("FARMER" as any)
              : ("BROKER" as any),
          prefix: values.prefix,
          firstName: values.firstName,
          lastName: values.lastName,
          phone: normalizedPhone,
          email: normalizedEmail,
          birthDate: values.birthDate ? new Date(values.birthDate) : null,
          gender: values.gender as any,
          age: computeAgeFromBirthDate(values.birthDate) ?? (values.age as number | undefined),
          companyName: values.companyName,
          taxId: values.taxId,
          address: values.address,
          province: values.province,
          district: values.district,
          subdistrict: values.subdistrict,
          postalCode: values.postalCode,
          responsibleEmployeeId: values.responsibleEmployeeId ?? undefined,
          relationshipScore: values.relationshipScore ?? undefined,
        },
      });

      if (values.type === "DEALER") {
        await (tx as any).dealerDetail.upsert({
          where: { customerId: customerId },
          update: {
            contactName:
              values.contactPerson && values.contactPerson.trim().length
                ? values.contactPerson
                : [values.prefix, values.firstName, values.lastName].filter(Boolean).join(" "),
            contactPhone: values.contactPhone,
            contactEmail: values.contactEmail ?? undefined,
            latitude:
              values.latitude !== undefined && values.latitude !== null && String(values.latitude) !== ""
                ? Number(values.latitude)
                : undefined,
            longitude:
              values.longitude !== undefined && values.longitude !== null && String(values.longitude) !== ""
                ? Number(values.longitude)
                : undefined,
            businessNotes: values.businessNotes ?? undefined,
            creditLimit:
              values.creditLimit !== undefined && values.creditLimit !== null && String(values.creditLimit) !== ""
                ? Number(values.creditLimit)
                : undefined,
            promotionBudget:
              values.promotionBudget !== undefined && values.promotionBudget !== null && String(values.promotionBudget) !== ""
                ? Number(values.promotionBudget)
                : undefined,
          },
          create: {
            customerId,
            contactName:
              values.contactPerson && values.contactPerson.trim().length
                ? values.contactPerson
                : [values.prefix, values.firstName, values.lastName].filter(Boolean).join(" "),
            contactPhone: values.contactPhone,
            contactEmail: values.contactEmail ?? undefined,
            latitude:
              values.latitude !== undefined && values.latitude !== null && String(values.latitude) !== ""
                ? Number(values.latitude)
                : undefined,
            longitude:
              values.longitude !== undefined && values.longitude !== null && String(values.longitude) !== ""
                ? Number(values.longitude)
                : undefined,
            businessNotes: values.businessNotes ?? undefined,
            creditLimit:
              values.creditLimit !== undefined && values.creditLimit !== null && String(values.creditLimit) !== ""
                ? Number(values.creditLimit)
                : undefined,
            promotionBudget:
              values.promotionBudget !== undefined && values.promotionBudget !== null && String(values.promotionBudget) !== ""
                ? Number(values.promotionBudget)
                : undefined,
          },
        });
      } else if (values.type === "SUBDEALER") {
        await (tx as any).subDealerDetail.upsert({
          where: { customerId: customerId },
          update: {
            dealerId: values.dealerId ?? undefined,
            contactPhone: values.contactPhone ?? undefined,
            contactEmail: values.contactEmail ?? undefined,
            latitude:
              values.latitude !== undefined && values.latitude !== null && String(values.latitude) !== ""
                ? Number(values.latitude)
                : undefined,
            longitude:
              values.longitude !== undefined && values.longitude !== null && String(values.longitude) !== ""
                ? Number(values.longitude)
                : undefined,
            competitor: values.competitor ?? undefined,
            cropsInArea: values.cropsInArea ?? undefined,
            averageMonthlyPurchase:
              values.averageMonthlyPurchase !== undefined && values.averageMonthlyPurchase !== null && String(values.averageMonthlyPurchase) !== ""
                ? Number(values.averageMonthlyPurchase)
                : undefined,
            mainProducts: values.mainProducts ?? undefined,
            brandsSold: values.brandsSold ?? undefined,
            areaType: values.areaType ?? undefined,
            businessNotes: values.businessNotes ?? undefined,
          },
          create: {
            customerId,
            dealerId: values.dealerId ?? undefined,
            contactPhone: values.contactPhone ?? undefined,
            contactEmail: values.contactEmail ?? undefined,
            latitude:
              values.latitude !== undefined && values.latitude !== null && String(values.latitude) !== ""
                ? Number(values.latitude)
                : undefined,
            longitude:
              values.longitude !== undefined && values.longitude !== null && String(values.longitude) !== ""
                ? Number(values.longitude)
                : undefined,
            competitor: values.competitor ?? undefined,
            cropsInArea: values.cropsInArea ?? undefined,
            averageMonthlyPurchase:
              values.averageMonthlyPurchase !== undefined && values.averageMonthlyPurchase !== null && String(values.averageMonthlyPurchase) !== ""
                ? Number(values.averageMonthlyPurchase)
                : undefined,
            mainProducts: values.mainProducts ?? undefined,
            brandsSold: values.brandsSold ?? undefined,
            areaType: values.areaType ?? undefined,
            businessNotes: values.businessNotes ?? undefined,
          },
        });
      } else if (values.type === "FARMER") {
        const plots = values.farmPlots ?? [];
        const areaSum = plots.reduce((sum, p) => sum + (Number(p.planting_area) || 0), 0);
        const first = plots[0];
        const fd = await (tx as any).farmerDetail.upsert({
          where: { customerId: customerId },
          update: {
            dealerId: values.dealerId ?? undefined,
            areaSize: areaSum || (values.farmSize !== undefined && values.farmSize !== null && String(values.farmSize) !== "" ? Number(values.farmSize) : undefined),
            cropType: first?.crop_type || (values.cropType ? String(values.cropType) : undefined),
            cultivar: first?.crop_variety || undefined,
            latitude: first?.latitude ?? (values.latitude !== undefined && values.latitude !== null && String(values.latitude) !== "" ? Number(values.latitude) : undefined),
            longitude: first?.longitude ?? (values.longitude !== undefined && values.longitude !== null && String(values.longitude) !== "" ? Number(values.longitude) : undefined),
          },
          create: {
            customerId,
            dealerId: values.dealerId ?? undefined,
            areaSize: areaSum || (values.farmSize !== undefined && values.farmSize !== null && String(values.farmSize) !== "" ? Number(values.farmSize) : undefined),
            cropType: first?.crop_type || (values.cropType ? String(values.cropType) : undefined),
            cultivar: first?.crop_variety || undefined,
            latitude: first?.latitude ?? (values.latitude !== undefined && values.latitude !== null && String(values.latitude) !== "" ? Number(values.latitude) : undefined),
            longitude: first?.longitude ?? (values.longitude !== undefined && values.longitude !== null && String(values.longitude) !== "" ? Number(values.longitude) : undefined),
          },
        });
        // Sync plots by upserting existing and creating new; delete removed
        const existing: any[] = await (tx as any).farmPlot.findMany({ where: { farmerDetailId: fd.id }, select: { id: true } });
        const existingIds = new Set((existing.map((r: any) => r.id).filter(Boolean) as Array<string | number>).map(String));
        const submittedIds = new Set(((plots.map((p: any) => p.id).filter(Boolean)) as Array<string | number>).map(String));
        const toDelete = [...existingIds].filter((id) => !submittedIds.has(id));
        if (toDelete.length) {
          await (tx as any).farmPlot.deleteMany({ where: { id: { in: toDelete } } });
        }
        for (const p of plots) {
          const data = {
            farmerDetailId: fd.id,
            latitude: p.latitude !== undefined && p.latitude !== null && String(p.latitude) !== "" ? Number(p.latitude) : undefined,
            longitude: p.longitude !== undefined && p.longitude !== null && String(p.longitude) !== "" ? Number(p.longitude) : undefined,
            plantingArea: p.planting_area !== undefined && p.planting_area !== null && String(p.planting_area) !== "" ? Number(p.planting_area) : undefined,
            cropType: p.crop_type || undefined,
            cropVariety: p.crop_variety || undefined,
            soilType: p.soil_type || undefined,
            waterSource: p.water_source || undefined,
            machineryUsed: Array.isArray(p.machinery_used) ? p.machinery_used : undefined,
          } as any;
          const pid = p.id ? String(p.id) : undefined;
          if (pid && existingIds.has(pid)) {
            await (tx as any).farmPlot.update({ where: { id: pid }, data });
          } else if (pid && !existingIds.has(pid)) {
            // If an unknown id is submitted (e.g., stale client), create a new row instead of failing update
            await (tx as any).farmPlot.create({ data });
          } else {
            await (tx as any).farmPlot.create({ data });
          }
        }
      } else if (values.type === "BROKER") {
        await (tx as any).brokerDetail.upsert({
          where: { customerId },
          update: {
            cropTypes: values.cropType ? String(values.cropType) : undefined,
            currentCropVolume: values.currentCropVolume ?? undefined,
            farmerNetworkCount: values.farmerNetworkCount ?? undefined,
            plotCount: values.plotCount ?? undefined,
            areaSize:
              values.farmSize !== undefined && values.farmSize !== null && String(values.farmSize) !== ""
                ? Number(values.farmSize)
                : undefined,
            plantingCyclesPerYear: values.plantingCyclesPerYear ?? undefined,
            creditTermForFarmers: values.creditTermForFarmers ?? undefined,
            agriChemValuePerCycle: values.agriChemValuePerCycle ?? undefined,
            agriChemQtyPerCycle: values.agriChemQtyPerCycle ?? undefined,
            regularStore: values.regularStore ?? undefined,
            serviceTypes: values.serviceTypes ?? undefined,
            brandsUsed: values.brandsUsed ?? undefined,
          },
          create: {
            customerId,
            cropTypes: values.cropType ? String(values.cropType) : undefined,
            currentCropVolume: values.currentCropVolume ?? undefined,
            farmerNetworkCount: values.farmerNetworkCount ?? undefined,
            plotCount: values.plotCount ?? undefined,
            areaSize:
              values.farmSize !== undefined && values.farmSize !== null && String(values.farmSize) !== ""
                ? Number(values.farmSize)
                : undefined,
            plantingCyclesPerYear: values.plantingCyclesPerYear ?? undefined,
            creditTermForFarmers: values.creditTermForFarmers ?? undefined,
            agriChemValuePerCycle: values.agriChemValuePerCycle ?? undefined,
            agriChemQtyPerCycle: values.agriChemQtyPerCycle ?? undefined,
            regularStore: values.regularStore ?? undefined,
            serviceTypes: values.serviceTypes ?? undefined,
            brandsUsed: values.brandsUsed ?? undefined,
          },
        });
      }
    });
  });

  revalidatePath("/dashboard/customers");
  revalidatePath(`/dashboard/customers/${customerId}/edit`);
}
