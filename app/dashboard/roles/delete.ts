"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function deleteRole(roleId: string) {
  try {
    await prisma.roleDefinition.update({
      where: { id: roleId },
      data: {
        deletedAt: new Date(),
      },
    });
  } catch (error) {
    throw new Error("ไม่สามารถลบข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
  }

  revalidatePath("/dashboard/roles");
}