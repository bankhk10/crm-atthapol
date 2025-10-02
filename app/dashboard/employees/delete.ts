"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function deleteEmployee(employeeId: string) {
  try {
    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        deletedAt: new Date(),
      },
    });
  } catch (error) {
    throw new Error("ไม่สามารถลบข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
  }

  revalidatePath("/dashboard/employees");
}