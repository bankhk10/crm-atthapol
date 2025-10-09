"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { productFormSchema, type ProductFormValues } from "./validation";
import crypto from "crypto";
import path from "path";
import { promises as fs } from "fs";

async function safeDeleteFiles(urls: string[]) {
  const uploadRoot = path.join(process.cwd(), "public", "uploads", "products");
  for (const url of urls) {
    if (!url || typeof url !== "string") continue;
    // only allow deleting inside /uploads/products
    const rel = url.replace(/^\/+/, "");
    if (!rel.startsWith("uploads/products/")) continue;
    const abs = path.join(process.cwd(), "public", rel);
    const normalized = path.normalize(abs);
    if (!normalized.startsWith(uploadRoot)) continue;
    try {
      // ensure no other references exist
      const imgRows = await prisma.$queryRaw<any>`SELECT COUNT(*) as c FROM ProductImage WHERE url = ${url}`;
      const prodRows = await prisma.$queryRaw<any>`SELECT COUNT(*) as c FROM Product WHERE imageUrl = ${url}`;
      const c1 = Number(imgRows?.[0]?.c ?? 0);
      const c2 = Number(prodRows?.[0]?.c ?? 0);
      if (c1 + c2 > 0) continue;
      await fs.unlink(normalized).catch(() => {});
    } catch {
      // ignore deletion errors
    }
  }
}

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
        features: v.features,
        packagingSize: v.packagingSize,
      },
    });
  } catch (e: any) {
    if (e?.code === "P2002") {
      throw new Error("รหัสสินค้านี้ถูกใช้แล้ว กรุณาเปลี่ยนรหัสสินค้าใหม่");
    }
    throw e;
  }

  // Persist additional images if provided
  if (Array.isArray(v.imageUrls) && v.imageUrls.length > 0) {
    for (let i = 0; i < v.imageUrls.length; i++) {
      const url = v.imageUrls[i];
      // Use raw insert to avoid relying on regenerated Prisma client
      await prisma.$executeRaw`INSERT INTO ProductImage (id, productId, url, sort) VALUES (${crypto.randomUUID()}, ${product.id}, ${url}, ${i})`;
    }
  }

  // Persist plant associations
  if (Array.isArray(v.plantIds) && v.plantIds.length > 0) {
    await prisma.productPlant.createMany({
      data: v.plantIds.map((plantId) => ({
        productId: product.id,
        plantId: plantId,
      })),
    });
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
  // Capture previous references for cleanup
  const prevProduct = await prisma.product.findUnique({ where: { id }, select: { imageUrl: true } });
  const prevImages = await prisma.$queryRaw<{ url: string }[]>`SELECT url FROM ProductImage WHERE productId = ${id}`;

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
        imageUrl: v.imageUrl && v.imageUrl.length > 0 ? v.imageUrl : null,
        description: v.description,
        features: v.features,
        packagingSize: v.packagingSize,
      },
    });
  } catch (e: any) {
    if (e?.code === "P2002") {
      throw new Error("รหัสสินค้านี้ถูกใช้แล้ว กรุณาเปลี่ยนรหัสสินค้าใหม่");
    }
    throw e;
  }

  // Replace images set if provided
  if (Array.isArray(v.imageUrls)) {
    const urls = v.imageUrls.filter((u) => !!u).slice(0, 10);
    await prisma.$transaction([
      prisma.$executeRaw`DELETE FROM ProductImage WHERE productId = ${id}`,
      ...urls.map((url, i) => prisma.$executeRaw`INSERT INTO ProductImage (id, productId, url, sort) VALUES (${crypto.randomUUID()}, ${id}, ${url}, ${i})`),
    ]);
    // after replacement, delete files that are no longer referenced
    const oldUrls = (prevImages || []).map((r) => r.url);
    const toDelete = oldUrls.filter((u) => !urls.includes(u));
    await safeDeleteFiles(toDelete);
  }

  // Update plant associations
  if (Array.isArray(v.plantIds)) {
    await prisma.$transaction([
      prisma.productPlant.deleteMany({ where: { productId: id } }),
      prisma.productPlant.createMany({
        data: v.plantIds.map((plantId) => ({
          productId: id,
          plantId: plantId,
        })),
      }),
    ]);
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

  // cleanup old main image file if changed and not referenced
  if (prevProduct?.imageUrl && (v.imageUrl ?? null) !== prevProduct.imageUrl) {
    await safeDeleteFiles([prevProduct.imageUrl]);
  }
}

export async function replaceProductImages(productId: string, urlsRaw: string[]) {
  const id = String(productId);
  const urls = (urlsRaw ?? []).filter((u) => typeof u === "string" && u.trim().length > 0).slice(0, 10);
  const prevImages = await prisma.$queryRaw<{ url: string }[]>`SELECT url FROM ProductImage WHERE productId = ${id}`;
  await prisma.$transaction([
    prisma.$executeRaw`DELETE FROM ProductImage WHERE productId = ${id}`,
    ...urls.map((url, i) => prisma.$executeRaw`INSERT INTO ProductImage (id, productId, url, sort) VALUES (${crypto.randomUUID()}, ${id}, ${url}, ${i})`),
  ]);
  const oldUrls = (prevImages || []).map((r) => r.url);
  const toDelete = oldUrls.filter((u) => !urls.includes(u));
  await safeDeleteFiles(toDelete);
  revalidatePath(`/dashboard/products/${id}`);
  revalidatePath(`/dashboard/products/${id}/edit`);
  revalidatePath(`/dashboard/products`);
}
