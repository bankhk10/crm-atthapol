"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { withActor } from "@/lib/with-actor";

export async function deleteCustomer(customerId: string) {
  try {
    const session = await getServerSession(authOptions);
    const perms = session?.user?.permissions ?? [];
    if (!hasPermission(perms, "customers", "delete")) {
      throw new Error("คุณไม่มีสิทธิ์ลบลูกค้า");
    }
    await withActor(async () => {
      const now = new Date();
      await (prisma as any).customer.update({
        where: { id: customerId },
        data: { deletedAt: now },
      });
    });
  } catch (error) {
    throw new Error("ไม่สามารถลบข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
  }

  revalidatePath("/dashboard/customers");
}
