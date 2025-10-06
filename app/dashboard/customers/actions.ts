"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
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

async function generateCode(tx: Prisma.TransactionClient, model: "dealer" | "subDealer" | "farmer") {
  const prefix = model === "dealer" ? "DLR-" : model === "subDealer" ? "SBD-" : "FRM-";
  const last = await (tx as any)[model].findFirst({
    where: { deletedAt: null, code: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { code: true },
  });
  const lastNumber = last ? Number.parseInt(String(last.code).replace(/\D/g, ""), 10) : 0;
  const nextNumber = Number.isFinite(lastNumber) ? lastNumber + 1 : 1;
  return `${prefix}${nextNumber.toString().padStart(4, "0")}`;
}

export async function createCustomer(rawValues: CustomerFormValues) {
  const values = customerFormSchema.parse(rawValues);
  const session = await getServerSession(authOptions);

  await runWithRequestContext({ userId: session?.user?.id }, async () => {
    const displayName =
      (values.companyName && String(values.companyName).trim()) ||
      [values.prefix, values.firstName, values.lastName].filter(Boolean).join(" ");

    await prisma.$transaction(async (tx) => {
      if (values.type === "DEALER") {
        const code = await generateCode(tx, "dealer");
        const created = await tx.dealer.create({
          data: {
            code,
            name: displayName,
            phone: values.phone,
            email: values.email,
            taxId: values.taxId,
            address: values.address,
            province: values.province,
            district: values.district,
            subdistrict: values.subdistrict,
            postalCode: values.postalCode,
            latitude: values.latitude,
            longitude: values.longitude,
            responsibleEmployeeId: values.responsibleEmployeeId ?? undefined,
            businessInfo: values.creditLimit
              ? { create: { creditLimit: Number(values.creditLimit) } }
              : undefined,
          },
        });
        return created.id;
      }

      if (values.type === "SUBDEALER") {
        const code = values.subDealerCode && String(values.subDealerCode).trim().length
          ? String(values.subDealerCode).trim()
          : await generateCode(tx, "subDealer");
        const created = await tx.subDealer.create({
          data: {
            code,
            name: displayName,
            phone: values.phone,
            email: values.email,
            taxId: values.taxId,
            address: values.address,
            province: values.province,
            district: values.district,
            subdistrict: values.subdistrict,
            postalCode: values.postalCode,
            latitude: values.latitude,
            longitude: values.longitude,
            responsibleEmployeeId: values.responsibleEmployeeId ?? undefined,
            // dealerId left empty unless UI collects it
          },
        });
        return created.id;
      }

      // FARMER
      const code = await generateCode(tx, "farmer");
      const created = await tx.farmer.create({
        data: {
          code,
          name: displayName,
          phone: values.phone,
          email: values.email,
          address: values.address,
          province: values.province,
          district: values.district,
          subdistrict: values.subdistrict,
          postalCode: values.postalCode,
          latitude: values.latitude,
          longitude: values.longitude,
          birthDate: values.birthDate ? new Date(values.birthDate) : null,
          gender: values.gender as any,
          responsibleEmployeeId: values.responsibleEmployeeId ?? undefined,
          farmName: values.farmName ? String(values.farmName) : undefined,
          farmSize: values.farmSize !== undefined && values.farmSize !== null && String(values.farmSize) !== ""
            ? Number(values.farmSize)
            : undefined,
          cropType: values.cropType ? String(values.cropType) : undefined,
        },
      });
      return created.id;
    });
  });

  revalidatePath("/dashboard/customers");
}

export async function updateCustomer(customerId: string, rawValues: CustomerFormValues) {
  const values = customerFormSchema.parse(rawValues);
  const session = await getServerSession(authOptions);

  await runWithRequestContext({ userId: session?.user?.id }, async () => {
    const displayName =
      (values.companyName && String(values.companyName).trim()) ||
      [values.prefix, values.firstName, values.lastName].filter(Boolean).join(" ");

    // Try update Dealer
    const dealer = await prisma.dealer.findUnique({ where: { id: customerId } });
    if (dealer) {
      await prisma.dealer.update({
        where: { id: customerId },
        data: {
          name: displayName,
          phone: values.phone,
          email: values.email,
          taxId: values.taxId,
          address: values.address,
          province: values.province,
          district: values.district,
          subdistrict: values.subdistrict,
          postalCode: values.postalCode,
          latitude: values.latitude,
          longitude: values.longitude,
          responsibleEmployeeId: values.responsibleEmployeeId ?? undefined,
        },
      });
      if (values.creditLimit !== undefined && values.creditLimit !== null && String(values.creditLimit) !== "") {
        await prisma.businessInfo.upsert({
          where: { dealerId: customerId },
          update: { creditLimit: Number(values.creditLimit) },
          create: { dealerId: customerId, creditLimit: Number(values.creditLimit) },
        });
      }
      return;
    }

    // Try update SubDealer
    const sub = await prisma.subDealer.findUnique({ where: { id: customerId } });
    if (sub) {
      await prisma.subDealer.update({
        where: { id: customerId },
        data: {
          name: displayName,
          phone: values.phone,
          email: values.email,
          taxId: values.taxId,
          address: values.address,
          province: values.province,
          district: values.district,
          subdistrict: values.subdistrict,
          postalCode: values.postalCode,
          latitude: values.latitude,
          longitude: values.longitude,
          responsibleEmployeeId: values.responsibleEmployeeId ?? undefined,
        },
      });
      if (values.creditLimit !== undefined && values.creditLimit !== null && String(values.creditLimit) !== "") {
        await prisma.businessInfo.upsert({
          where: { subDealerId: customerId },
          update: { creditLimit: Number(values.creditLimit) },
          create: { subDealerId: customerId, creditLimit: Number(values.creditLimit) },
        });
      }
      return;
    }

    // Otherwise update Farmer
    await prisma.farmer.update({
      where: { id: customerId },
      data: {
        name: displayName,
        phone: values.phone,
        email: values.email,
        address: values.address,
        province: values.province,
        district: values.district,
        subdistrict: values.subdistrict,
        postalCode: values.postalCode,
        latitude: values.latitude,
        longitude: values.longitude,
        birthDate: values.birthDate ? new Date(values.birthDate) : null,
        gender: values.gender as any,
        responsibleEmployeeId: values.responsibleEmployeeId ?? undefined,
        farmName: values.farmName ? String(values.farmName) : undefined,
        farmSize: values.farmSize !== undefined && values.farmSize !== null && String(values.farmSize) !== ""
          ? Number(values.farmSize)
          : undefined,
        cropType: values.cropType ? String(values.cropType) : undefined,
      },
    });
  });

  revalidatePath("/dashboard/customers");
  revalidatePath(`/dashboard/customers/${customerId}/edit`);
}
