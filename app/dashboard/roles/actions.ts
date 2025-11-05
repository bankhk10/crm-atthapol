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
  department: z.string().trim().optional().default(""),
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
          department: values.department ? values.department : null,
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
  // detect whether client actually sent the permissions field (to avoid accidental wipe)
  const hasPermissionsInput =
    rawValues && typeof rawValues === "object" && Object.prototype.hasOwnProperty.call(rawValues as any, "permissions");
  const values = roleFormSchema.parse(rawValues);

  await withActor(async () => {
    await prisma.$transaction(async (tx) => {
      const role = await tx.roleDefinition.update({
        where: { id: roleId },
        data: {
          key: values.key,
          name: values.name,
          description: values.description || null,
          department: values.department ? values.department : null,
        },
      });

      if (hasPermissionsInput) {
        const permissionIds = await upsertPermissions(tx, values.permissions);
        // Replace assignments atomically to avoid diff edge cases
        await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
        if (permissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
            skipDuplicates: true,
          });
        }
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
    // Normalize category/name to lowercase to avoid case-sensitive duplicates
    const category = group.category.trim().toLowerCase();
    if (!category) continue;

    const uniqueItems = Array.from(new Set((group.items ?? []).map((item) => item.trim().toLowerCase()))).filter(
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
      // Prisma can return target as string or string[] or index name
      const rawTarget = (error.meta?.target ?? "") as string | string[];
      const targets = Array.isArray(rawTarget) ? rawTarget : [String(rawTarget)];
      const joined = targets.join(",").toLowerCase();

      // Match by field or unique index name
      if (joined.includes("roledefinition_key") || joined.includes("key")) {
        throw new Error("รหัสบทบาทนี้ถูกใช้งานแล้ว กรุณาใช้รหัสอื่น");
      }

      if (joined.includes("roledefinition_name") || joined.includes("name")) {
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
