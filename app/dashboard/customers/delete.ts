"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { withActor } from "@/lib/with-actor";

export async function deleteCustomer(customerId: string) {
  try {
    await withActor(async () => {
      const now = new Date();
      // Try each model by id
      const dealer = await prisma.dealer.findUnique({ where: { id: customerId } });
      if (dealer) {
        await prisma.dealer.update({ where: { id: customerId }, data: { deletedAt: now } });
        return;
      }
      const sub = await prisma.subDealer.findUnique({ where: { id: customerId } });
      if (sub) {
        await prisma.subDealer.update({ where: { id: customerId }, data: { deletedAt: now } });
        return;
      }
      await prisma.farmer.update({ where: { id: customerId }, data: { deletedAt: now } });
    });
  } catch (error) {
    throw new Error("ไม่สามารถลบข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
  }

  revalidatePath("/dashboard/customers");
}

