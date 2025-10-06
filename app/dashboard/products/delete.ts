"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function deleteProduct(productId: string) {
  await prisma.product.update({ where: { id: productId }, data: { deletedAt: new Date() } });
  revalidatePath("/dashboard/products");
}

