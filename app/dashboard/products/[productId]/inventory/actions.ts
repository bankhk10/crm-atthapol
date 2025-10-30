"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const priceSchema = z.object({
  price: z
    .preprocess((v) => (typeof v === "string" ? v.trim() : v), z.coerce.number().min(0))
    .optional(),
});

const lotSchema = z.object({
  lotNumber: z.string().trim().min(1, "กรุณากรอกเลขล็อต").max(100),
  qtyOnHand: z.coerce.number().int().min(0).default(0),
  importedAt: z
    .string()
    .trim()
    .transform((v) => (v ? new Date(v) : null))
    .nullable()
    .optional(),
  expDate: z
    .string()
    .trim()
    .transform((v) => (v ? new Date(v) : null))
    .nullable()
    .optional(),
  note: z.string().trim().max(500).optional().nullable(),
});

// For updates, allow empty string to be treated as 'no change' for lotNumber/note
const updateLotSchema = z.object({
  lotNumber: z
    .preprocess((v) => (typeof v === "string" && v.trim().length === 0 ? undefined : v), z.string().trim().min(1))
    .optional(),
  qtyOnHand: z.coerce.number().int().min(0).optional(),
  importedAt: z
    .string()
    .trim()
    .transform((v) => (v ? new Date(v) : null))
    .nullable()
    .optional(),
  expDate: z
    .string()
    .trim()
    .transform((v) => (v ? new Date(v) : null))
    .nullable()
    .optional(),
  note: z
    .preprocess((v) => (typeof v === "string" && v.trim().length === 0 ? undefined : v), z.string().trim().max(500))
    .nullable()
    .optional(),
});

export async function updateProductPrice(productId: string, raw: unknown) {
  const id = String(productId);
  const parsed = priceSchema.safeParse(raw);
  if (!parsed.success) {
    // zod v4 uses 'issues'
    const msg = (parsed.error.issues?.[0]?.message as string) || "ข้อมูลราคาไม่ถูกต้อง";
    throw new Error(msg);
  }
  await prisma.product.update({ where: { id }, data: { price: parsed.data.price ?? null } });
  revalidatePath(`/dashboard/products/${id}`);
  revalidatePath(`/dashboard/products/${id}/inventory`);
}

export async function createLot(productId: string, raw: unknown) {
  const id = String(productId);
  const parsed = lotSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = (parsed.error.issues?.[0]?.message as string) || "ข้อมูลล็อตไม่ถูกต้อง";
    throw new Error(msg);
  }
  const data = parsed.data;
  await prisma.stock.create({
    data: {
      productId: id,
      lotNumber: data.lotNumber,
      qtyOnHand: data.qtyOnHand,
      qtyReserved: 0,
      qtyVirtual: 0,
      // importedAt will be set by overriding createdAt when provided
      createdAt: (data.importedAt as unknown as Date | null) ?? undefined,
      expDate: (data.expDate as unknown as Date | null) ?? null,
      note: data.note ?? null,
    },
  });
  revalidatePath(`/dashboard/products/${id}`);
  revalidatePath(`/dashboard/products/${id}/inventory`);
}

export async function updateLot(productId: string, stockId: string, raw: unknown) {
  const pid = String(productId);
  const sid = String(stockId);
  // Normalize empty-string fields to be omitted
  let normalized: Record<string, unknown> = {};
  if (raw && typeof raw === "object") {
    normalized = { ...(raw as Record<string, unknown>) };
    const keys = ["lotNumber", "note", "importedAt", "expDate"] as const;
    for (const k of keys) {
      const v = (normalized as Record<string, unknown>)[k];
      if (typeof v === "string" && v.trim().length === 0) {
        delete (normalized as Record<string, unknown>)[k];
      }
    }
  }
  const parsed = updateLotSchema.safeParse(normalized);
  if (!parsed.success) {
    const msg = (parsed.error.issues?.[0]?.message as string) || "ข้อมูลล็อตไม่ถูกต้อง";
    throw new Error(msg);
  }
  const data = parsed.data;
  // If the stock row no longer exists (or was a client-side draft), skip updating gracefully
  const exists = await prisma.stock.findUnique({ where: { id: sid } });
  if (!exists) {
    // still trigger revalidate for UI consistency
    revalidatePath(`/dashboard/products/${pid}`);
    revalidatePath(`/dashboard/products/${pid}/inventory`);
    return;
  }
  await prisma.stock.update({
    where: { id: sid },
    data: {
      lotNumber: data.lotNumber,
      qtyOnHand: data.qtyOnHand,
      createdAt: (data.importedAt as unknown as Date | null) ?? undefined,
      expDate: (data.expDate as unknown as Date | null) ?? undefined,
      note: data.note,
    },
  });
  revalidatePath(`/dashboard/products/${pid}`);
  revalidatePath(`/dashboard/products/${pid}/inventory`);
}

export async function deleteLot(productId: string, stockId: string) {
  const pid = String(productId);
  const sid = String(stockId);
  // Soft delete handled by prisma extension via delete -> sets deletedAt
  await prisma.stock.delete({ where: { id: sid } });
  revalidatePath(`/dashboard/products/${pid}`);
  revalidatePath(`/dashboard/products/${pid}/inventory`);
}
