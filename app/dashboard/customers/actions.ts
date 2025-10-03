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
  name: z.string().min(1, "กรุณากรอกชื่อ"),
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
    const db = prisma as any;
    await db.customer.create({
      data: {
        type: values.type as any,
        name: values.name,
        phone: values.phone,
        email: values.email,
        taxId: values.taxId,
        address: values.address,
        province: values.province,
        district: values.district,
        subdistrict: values.subdistrict,
        postalCode: values.postalCode,
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
    const db = prisma as any;
    await db.customer.update({
      where: { id: customerId },
      data: {
        type: values.type as any,
        name: values.name,
        phone: values.phone,
        email: values.email,
        taxId: values.taxId,
        address: values.address,
        province: values.province,
        district: values.district,
        subdistrict: values.subdistrict,
        postalCode: values.postalCode,
        profile: values.profile as any,
      },
    });
  });

  revalidatePath("/dashboard/customers");
  revalidatePath(`/dashboard/customers/${customerId}/edit`);
}
