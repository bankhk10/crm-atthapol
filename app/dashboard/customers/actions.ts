"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { runWithRequestContext } from "@/lib/request-context";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import type { CustomerFormValues } from "./types";

const customerFormSchema = z.object({
  type: z.enum(["DEALER", "SUBDEALER", "FARMER"]),
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
  phone: z.string().min(1, "กรุณากรอกเบอร์โทร"),
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

// No auto-generated codes in new unified Customer model

export async function createCustomer(rawValues: CustomerFormValues) {
  const values = customerFormSchema.parse(rawValues);
  const session = await getServerSession(authOptions);

  await runWithRequestContext({ userId: session?.user?.id }, async () => {
    await prisma.$transaction(async (tx) => {
      const created = await tx.customer.create({
        data: {
          responsibleEmployeeId: values.responsibleEmployeeId ?? undefined,
          customerType:
            values.type === "DEALER"
              ? ("DEALER" as any)
              : values.type === "SUBDEALER"
              ? ("SUB_DEALER" as any)
              : ("FARMER" as any),
          prefix: values.prefix,
          firstName: values.firstName,
          lastName: values.lastName,
          phone: values.phone,
          email: values.email,
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
        },
      });

      if (values.type === "DEALER") {
        await tx.dealerDetail.create({
          data: {
            customerId: created.id,
            contactName:
              values.contactPerson && values.contactPerson.trim().length
                ? values.contactPerson
                : [values.prefix, values.firstName, values.lastName].filter(Boolean).join(" "),
            contactPhone: values.contactPhone,
            creditLimit:
              values.creditLimit !== undefined && values.creditLimit !== null && String(values.creditLimit) !== ""
                ? Number(values.creditLimit)
                : undefined,
          },
        });
      } else if (values.type === "SUBDEALER") {
        await tx.subDealerDetail.create({
          data: {
            customerId: created.id,
            dealerId: values.dealerId ?? undefined,
          },
        });
      } else if (values.type === "FARMER") {
        await tx.farmerDetail.create({
          data: {
            customerId: created.id,
            dealerId: values.dealerId ?? undefined,
            areaSize:
              values.farmSize !== undefined && values.farmSize !== null && String(values.farmSize) !== ""
                ? Number(values.farmSize)
                : undefined,
            cropType: values.cropType ? String(values.cropType) : undefined,
            latitude: values.latitude !== undefined && values.latitude !== null && String(values.latitude) !== ""
              ? Number(values.latitude)
              : undefined,
            longitude: values.longitude !== undefined && values.longitude !== null && String(values.longitude) !== ""
              ? Number(values.longitude)
              : undefined,
          },
        });
      }

      return created.id;
    });
  });

  revalidatePath("/dashboard/customers");
}

export async function updateCustomer(customerId: string, rawValues: CustomerFormValues) {
  const values = customerFormSchema.parse(rawValues);
  const session = await getServerSession(authOptions);

  await runWithRequestContext({ userId: session?.user?.id }, async () => {
    await prisma.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id: customerId },
        data: {
          customerType:
            values.type === "DEALER"
              ? ("DEALER" as any)
              : values.type === "SUBDEALER"
              ? ("SUB_DEALER" as any)
              : ("FARMER" as any),
          prefix: values.prefix,
          firstName: values.firstName,
          lastName: values.lastName,
          phone: values.phone,
          email: values.email,
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
        },
      });

      if (values.type === "DEALER") {
        await tx.dealerDetail.upsert({
          where: { customerId: customerId },
          update: {
            contactName:
              values.contactPerson && values.contactPerson.trim().length
                ? values.contactPerson
                : [values.prefix, values.firstName, values.lastName].filter(Boolean).join(" "),
            contactPhone: values.contactPhone,
            creditLimit:
              values.creditLimit !== undefined && values.creditLimit !== null && String(values.creditLimit) !== ""
                ? Number(values.creditLimit)
                : undefined,
          },
          create: {
            customerId,
            contactName:
              values.contactPerson && values.contactPerson.trim().length
                ? values.contactPerson
                : [values.prefix, values.firstName, values.lastName].filter(Boolean).join(" "),
            contactPhone: values.contactPhone,
            creditLimit:
              values.creditLimit !== undefined && values.creditLimit !== null && String(values.creditLimit) !== ""
                ? Number(values.creditLimit)
                : undefined,
          },
        });
      } else if (values.type === "SUBDEALER") {
        await tx.subDealerDetail.upsert({
          where: { customerId: customerId },
          update: { dealerId: values.dealerId ?? undefined },
          create: { customerId, dealerId: values.dealerId ?? undefined },
        });
      } else if (values.type === "FARMER") {
        await tx.farmerDetail.upsert({
          where: { customerId: customerId },
          update: {
            dealerId: values.dealerId ?? undefined,
            areaSize:
              values.farmSize !== undefined && values.farmSize !== null && String(values.farmSize) !== ""
                ? Number(values.farmSize)
                : undefined,
            cropType: values.cropType ? String(values.cropType) : undefined,
            latitude: values.latitude !== undefined && values.latitude !== null && String(values.latitude) !== ""
              ? Number(values.latitude)
              : undefined,
            longitude: values.longitude !== undefined && values.longitude !== null && String(values.longitude) !== ""
              ? Number(values.longitude)
              : undefined,
          },
          create: {
            customerId,
            dealerId: values.dealerId ?? undefined,
            areaSize:
              values.farmSize !== undefined && values.farmSize !== null && String(values.farmSize) !== ""
                ? Number(values.farmSize)
                : undefined,
            cropType: values.cropType ? String(values.cropType) : undefined,
            latitude: values.latitude !== undefined && values.latitude !== null && String(values.latitude) !== ""
              ? Number(values.latitude)
              : undefined,
            longitude: values.longitude !== undefined && values.longitude !== null && String(values.longitude) !== ""
              ? Number(values.longitude)
              : undefined,
          },
        });
      }
    });
  });

  revalidatePath("/dashboard/customers");
  revalidatePath(`/dashboard/customers/${customerId}/edit`);
}
