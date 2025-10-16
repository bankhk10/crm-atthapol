"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import path from "path";
import { promises as fs } from "fs";

async function safeDeleteFiles(urls: string[]) {
  const uploadRoot = path.join(process.cwd(), "public", "uploads", "products");
  for (const url of urls) {
    if (!url || typeof url !== "string") continue;
    const rel = url.replace(/^\/+/, "");
    if (!rel.startsWith("uploads/products/")) continue;
    const abs = path.join(process.cwd(), "public", rel);
    const normalized = path.normalize(abs);
    if (!normalized.startsWith(uploadRoot)) continue;
    try {
      const c1 = await prisma.productImage.count({ where: { url } });
      const c2 = await prisma.product.count({ where: { imageUrl: url } });
      if (c1 + c2 > 0) continue;
      await fs.unlink(normalized).catch(() => {});
    } catch {
      // ignore errors
    }
  }
}

export async function deleteProduct(productId: string) {
  const id = String(productId);

  // Collect URLs before removing references
  const product = await prisma.product.findUnique({ where: { id }, select: { imageUrl: true } });
  const imageRows = await prisma.productImage.findMany({ where: { productId: id }, select: { url: true } });
  const urls = [product?.imageUrl, ...imageRows.map((r) => r.url)].filter((u): u is string => typeof u === "string" && u.length > 0);

  // Soft delete product and remove image references
  await prisma.$transaction([
    prisma.product.update({ where: { id }, data: { deletedAt: new Date(), imageUrl: null } }),
    prisma.productImage.deleteMany({ where: { productId: id } }),
  ]);

  // Now attempt to delete files that are no longer referenced anywhere
  await safeDeleteFiles(urls);

  revalidatePath("/dashboard/products");
}
