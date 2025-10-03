"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { runWithRequestContext } from "@/lib/request-context";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import type { CustomerFormValues } from "./types";

const customerFormSchema = z.object({
  type: z.enum(["DEALER", "SUBDEALER", "FARMER"]),
  prefix: z.string().min(1, "กรุณาเลือกคำนำหน้า"),
  firstName: z.string().min(1, "กรุณากรอกชื่อ"),
  lastName: z.string().min(1, "กรุณากรอกนามสกุล"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"], { message: "เพศไม่ถูกต้อง" }),
  birthDate: z.string().min(1, "กรุณาเลือกวันเกิด"),
  phone: z.string().min(1, "กรุณากรอกเบอร์โทร"),
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
  profile: z.any().optional(),
});

export async function createCustomer(rawValues: CustomerFormValues) {
  const values = customerFormSchema.parse(rawValues);
  const session = await getServerSession(authOptions);

  await runWithRequestContext({ userId: session?.user?.id }, async () => {
    const displayName =
      (values.profile && typeof values.profile === "object" && (values.profile as any).companyName && String((values.profile as any).companyName).trim()) ||
      [values.prefix, values.firstName, values.lastName].filter(Boolean).join(" ");

    const db = prisma as any;
    await db.customer.create({
      data: {
        type: values.type as any,
        name: displayName,
        phone: values.phone,
        email: values.email,
        taxId: values.taxId,
        address: values.address,
        province: values.province,
        district: values.district,
        subdistrict: values.subdistrict,
        postalCode: values.postalCode,
        prefix: values.prefix,
        firstName: values.firstName,
        lastName: values.lastName,
        birthDate: values.birthDate ? new Date(values.birthDate) : null,
        gender: values.gender as any,
        profile: values.profile as any,
      },
    });
  });

  revalidatePath("/dashboard/customers");
}

export async function updateCustomer(customerId: string, rawValues: CustomerFormValues) {
  const values = customerFormSchema.parse(rawValues);
  const session = await getServerSession(authOptions);

  await runWithRequestContext({ userId: session?.user?.id }, async () => {
    const displayName =
      (values.profile && typeof values.profile === "object" && (values.profile as any).companyName && String((values.profile as any).companyName).trim()) ||
      [values.prefix, values.firstName, values.lastName].filter(Boolean).join(" ");

    const db = prisma as any;
    await db.customer.update({
      where: { id: customerId },
      data: {
        type: values.type as any,
        name: displayName,
        phone: values.phone,
        email: values.email,
        taxId: values.taxId,
        address: values.address,
        province: values.province,
        district: values.district,
        subdistrict: values.subdistrict,
        postalCode: values.postalCode,
        prefix: values.prefix,
        firstName: values.firstName,
        lastName: values.lastName,
        birthDate: values.birthDate ? new Date(values.birthDate) : null,
        gender: values.gender as any,
        profile: values.profile as any,
      },
    });
  });

  revalidatePath("/dashboard/customers");
  revalidatePath(`/dashboard/customers/${customerId}/edit`);
}
