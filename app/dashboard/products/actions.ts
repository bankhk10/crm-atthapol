"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { productFormSchema, type ProductFormValues } from "./validation";

export async function createProduct(raw: ProductFormValues) {
  const v = productFormSchema.parse(raw);

  let product;
  try {
    product = await prisma.product.create({
      data: {
        productCode: v.productCode,
        lotNumber: v.lotNumber,
        nameTH: v.nameTH,
        nameEN: v.nameEN,
        category: v.category,
        brand: v.brand,
        unit: v.unit,
        price: v.price ?? null,
        mfgDate: v.mfgDate ? new Date(v.mfgDate) : null,
        expDate: v.expDate ? new Date(v.expDate) : null,
        status: v.status as any,
        imageUrl: v.imageUrl,
        description: v.description,
      },
    });
  } catch (e: any) {
    if (e?.code === "P2002") {
      throw new Error("รหัสสินค้านี้ถูกใช้แล้ว กรุณาเปลี่ยนรหัสสินค้าใหม่");
    }
    throw e;
  }

  await prisma.stock.create({
    data: {
      productId: product.id,
      qtyOnHand: v.qtyOnHand ?? 0,
      qtyReserved: v.qtyReserved ?? 0,
      qtyVirtual: v.qtyVirtual ?? 0,
      lotNumber: v.lotNumber,
      mfgDate: v.mfgDate ? new Date(v.mfgDate) : null,
      expDate: v.expDate ? new Date(v.expDate) : null,
      note: v.stockNote,
    },
  });

  revalidatePath("/dashboard/products");
  return product.id;
}

export async function updateProduct(productId: string, raw: ProductFormValues) {
  const v = productFormSchema.parse(raw);
  const id = String(productId);

  try {
    await prisma.product.update({
      where: { id },
      data: {
        productCode: v.productCode,
        lotNumber: v.lotNumber,
        nameTH: v.nameTH,
        nameEN: v.nameEN,
        category: v.category,
        brand: v.brand,
        unit: v.unit,
        price: v.price ?? null,
        mfgDate: v.mfgDate ? new Date(v.mfgDate) : null,
        expDate: v.expDate ? new Date(v.expDate) : null,
        status: v.status as any,
        imageUrl: v.imageUrl,
        description: v.description,
      },
    });
  } catch (e: any) {
    if (e?.code === "P2002") {
      throw new Error("รหัสสินค้านี้ถูกใช้แล้ว กรุณาเปลี่ยนรหัสสินค้าใหม่");
    }
    throw e;
  }

  const latest = await prisma.stock.findFirst({
    where: { productId: id, deletedAt: null },
    orderBy: { updatedAt: "desc" },
  });
  if (latest) {
    await prisma.stock.update({
      where: { id: latest.id },
      data: {
        qtyOnHand: v.qtyOnHand ?? latest.qtyOnHand,
        qtyReserved: v.qtyReserved ?? latest.qtyReserved,
        qtyVirtual: v.qtyVirtual ?? latest.qtyVirtual,
        lotNumber: v.lotNumber ?? latest.lotNumber,
        mfgDate: v.mfgDate ? new Date(v.mfgDate) : latest.mfgDate,
        expDate: v.expDate ? new Date(v.expDate) : latest.expDate,
        note: v.stockNote ?? latest.note,
      },
    });
  } else {
    await prisma.stock.create({
      data: {
        productId: id,
        qtyOnHand: v.qtyOnHand ?? 0,
        qtyReserved: v.qtyReserved ?? 0,
        qtyVirtual: v.qtyVirtual ?? 0,
        lotNumber: v.lotNumber,
        mfgDate: v.mfgDate ? new Date(v.mfgDate) : null,
        expDate: v.expDate ? new Date(v.expDate) : null,
        note: v.stockNote,
      },
    });
  }

  revalidatePath("/dashboard/products");
  revalidatePath(`/dashboard/products/${id}/edit`);
}

