"use server";

import type { Prisma } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { withActor } from "@/lib/with-actor";

import type { RoleFormValues } from "./types";

const permissionGroupSchema = z.object({
  category: z.string().trim().min(1, "กรุณากรอกชื่อหมวดสิทธิ์"),
  items: z
    .array(z.string().trim().min(1, "กรุณากรอกชื่อสิทธิ์"))
    .optional()
    .default([]),
});

const roleFormSchema = z.object({
  key: z.string().trim().min(1, "กรุณากรอกรหัสบทบาท"),
  name: z.string().trim().min(1, "กรุณากรอกชื่อบทบาท"),
  description: z.string().trim().optional().default(""),
  permissions: z.array(permissionGroupSchema).optional().default([]),
});

export async function createRole(rawValues: RoleFormValues) {
  const values = roleFormSchema.parse(rawValues);

  await withActor(async () => {
    await prisma.$transaction(async (tx) => {
      const role = await tx.roleDefinition.create({
        data: {
          key: values.key,
          name: values.name,
          description: values.description || null,
        },
      });

      const permissionIds = await upsertPermissions(tx, values.permissions);

      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId: role.id,
            permissionId,
          })),
          skipDuplicates: true,
        });
      }
    });
  }).catch(handlePrismaError);

  revalidateRoleViews();
}

export async function updateRole(roleId: string, rawValues: RoleFormValues) {
  const values = roleFormSchema.parse(rawValues);

  await withActor(async () => {
    await prisma.$transaction(async (tx) => {
      const role = await tx.roleDefinition.update({
        where: { id: roleId },
        data: {
          key: values.key,
          name: values.name,
          description: values.description || null,
        },
      });

      const permissionIds = await upsertPermissions(tx, values.permissions);
      const nextPermissionSet = new Set(permissionIds);

      const existingAssignments = await tx.rolePermission.findMany({
        where: { roleId: role.id },
      });

      const existingSet = new Set(existingAssignments.map((assignment) => assignment.permissionId));

      const toRemove = existingAssignments
        .filter((assignment) => !nextPermissionSet.has(assignment.permissionId))
        .map((assignment) => assignment.permissionId);

      if (toRemove.length > 0) {
        await tx.rolePermission.deleteMany({
          where: {
            roleId: role.id,
            permissionId: { in: toRemove },
          },
        });
      }

      const toAdd = permissionIds.filter((id) => !existingSet.has(id));

      if (toAdd.length > 0) {
        await tx.rolePermission.createMany({
          data: toAdd.map((permissionId) => ({
            roleId: role.id,
            permissionId,
          })),
          skipDuplicates: true,
        });
      }
    });
  }).catch(handlePrismaError);

  revalidateRoleViews();
}

async function upsertPermissions(
  tx: Prisma.TransactionClient,
  permissions: RoleFormValues["permissions"],
) {
  if (!permissions || permissions.length === 0) {
    return [] as string[];
  }

  const ids = new Set<string>();

  for (const group of permissions) {
    const category = group.category.trim();
    if (!category) continue;

    const uniqueItems = Array.from(new Set((group.items ?? []).map((item) => item.trim()))).filter(
      Boolean,
    );

    for (const name of uniqueItems) {
      const permission = await tx.permission.upsert({
        where: {
          category_name: {
            category,
            name,
          },
        },
        update: {},
        create: {
          category,
          name,
        },
      });

      ids.add(permission.id);
    }
  }

  return Array.from(ids.values());
}

function handlePrismaError(error: unknown): never {
  if (error instanceof PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = (error.meta?.target as string[]) ?? [];

      if (target.includes("key")) {
        throw new Error("รหัสบทบาทนี้ถูกใช้งานแล้ว กรุณาใช้รหัสอื่น");
      }

      if (target.includes("name")) {
        throw new Error("ชื่อบทบาทนี้ถูกใช้งานแล้ว กรุณาใช้ชื่ออื่น");
      }
    }

    if (error.code === "P2025") {
      throw new Error("ไม่พบบทบาทที่ต้องการแก้ไข");
    }
  }

  if (error instanceof Error) {
    throw error;
  }

  throw new Error("ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
}

function revalidateRoleViews() {
  revalidatePath("/dashboard/roles");
}
