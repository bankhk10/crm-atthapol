"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { withActor } from "@/lib/with-actor";

export async function deleteRole(roleId: string) {
  try {
    const session = await getServerSession(authOptions);
    const perms = session?.user?.permissions ?? [];
    if (!hasPermission(perms, "roles", "delete")) {
      throw new Error("คุณไม่มีสิทธิ์ลบบทบาท");
    }
    await withActor(async () => {
      await prisma.roleDefinition.update({
        where: { id: roleId },
        data: {
          deletedAt: new Date(),
        },
      });
    });
  } catch (error) {
    throw new Error("ไม่สามารถลบข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
  }

  revalidatePath("/dashboard/roles");
}
