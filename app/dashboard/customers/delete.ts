"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { withActor } from "@/lib/with-actor";

export async function deleteCustomer(customerId: string) {
  try {
    await withActor(async () => {
      const now = new Date();
      await prisma.customer.update({ where: { id: customerId }, data: { deletedAt: now } });
    });
  } catch (error) {
    throw new Error("ไม่สามารถลบข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
  }

  revalidatePath("/dashboard/customers");
}

