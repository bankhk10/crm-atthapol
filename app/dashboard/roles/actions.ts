"use server";

import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { withActor } from "@/lib/with-actor";

import type { RoleFormValues } from "./types";
import type { Prisma } from "@prisma/client";

const permissionGroupSchema = z.object({
  category: z.string().trim().min(1, "กรุณากรอกชื่อหมวดสิทธิ์"),
  items: z.array(z.string().trim().min(1, "กรุณากรอกชื่อสิทธิ์")).optional().default([]),
});

const roleFormSchema = z.object({
  key: z.string().trim().min(1, "กรุณากรอกรหัสบทบาท"),
  name: z.string().trim().min(1, "กรุณากรอกชื่อบทบาท"),
  description: z.string().trim().optional().default(""),
  department: z.string().trim().optional().default(""),
  permissions: z.array(permissionGroupSchema).optional().default([]),
});

export async function createRole(rawValues: RoleFormValues) {
  console.log("Starting createRole with values:", rawValues);
  const session = await getServerSession(authOptions);
  const perms = session?.user?.permissions ?? [];
  if (!hasPermission(perms, "roles", "create")) {
    throw new Error("คุณไม่มีสิทธิ์สร้างบทบาทใหม่");
  }

  const values = roleFormSchema.parse(rawValues);
  console.log("After schema parsing:", values);

  try {
    await withActor(async () => {
      await prisma.$transaction(async (tx) => {
        console.log("Creating role with data:", {
          key: values.key,
          name: values.name,
          description: values.description,
          department: values.department,
        });

        const role = await tx.roleDefinition.create({
          data: {
            key: values.key,
            name: values.name,
            description: values.description || null,
            department: values.department ? values.department : null,
          },
        });
        console.log("Created role:", role);

        console.log("Creating permissions for role, input permissions:", values.permissions);
        const permissionIds = await upsertPermissions(tx, values.permissions);
        console.log("Generated permission IDs:", permissionIds);

        if (permissionIds.length > 0) {
          const rolePermissions = permissionIds.map((permissionId) => ({
            roleId: role.id,
            permissionId,
          }));
          console.log("Creating role permissions:", rolePermissions);

          await tx.rolePermission.createMany({
            data: rolePermissions,
            skipDuplicates: true,
          });
        }
      });
    }).catch((error) => {
      console.error("Error in createRole:", error);
      throw error;
    });

    console.log("Role creation completed successfully");
    revalidateRoleViews();
  } catch (error) {
    console.error("Error in outer try-catch:", error);
    throw error;
  }
}

export async function updateRole(roleId: string, rawValues: RoleFormValues) {
  const session = await getServerSession(authOptions);
  const perms = session?.user?.permissions ?? [];
  if (!hasPermission(perms, "roles", "edit")) {
    throw new Error("คุณไม่มีสิทธิ์แก้ไขบทบาท");
  }
  const values = roleFormSchema.parse(rawValues);

  await withActor(async () => {
    await prisma.$transaction(async (tx) => {
      // First, get existing role and its permissions
      const existingRole = await tx.roleDefinition.findUnique({
        where: { id: roleId },
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      });

      if (!existingRole) {
        throw new Error("ไม่พบบทบาทที่ต้องการแก้ไข");
      }

      // Update role basic info
      await tx.roleDefinition.update({
        where: { id: roleId },
        data: {
          key: values.key,
          name: values.name,
          description: values.description || null,
          department: values.department ? values.department : null,
        },
      });

      // Get updated permission IDs
      const permissionIds = await upsertPermissions(tx, values.permissions);

      // Soft delete removed permissions
      await tx.rolePermission.updateMany({
        where: {
          roleId: roleId,
          NOT: { permissionId: { in: permissionIds } },
        },
        data: { deletedAt: new Date() },
      });

      // Add new permissions: first reactivate any soft-deleted rolePermission rows
      if (permissionIds.length > 0) {
        // Reactivate existing (soft-deleted) rolePermission rows for this role
        await tx.rolePermission.updateMany({
          where: {
            roleId: roleId,
            permissionId: { in: permissionIds },
            deletedAt: { not: null },
          },
          data: { deletedAt: null },
        });

        // Find current active assignments after reactivation
        const activeAssignments = await tx.rolePermission.findMany({
          where: { roleId: roleId, deletedAt: null },
          select: { permissionId: true },
        });
        const activeIds = activeAssignments.map((a) => a.permissionId);

        // Only create new assignments for permissions that still don't exist
        const newPermissionIds = permissionIds.filter((id) => !activeIds.includes(id));

        if (newPermissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: newPermissionIds.map((permissionId) => ({
              roleId: roleId,
              permissionId,
            })),
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
  console.log("Starting upsertPermissions with permissions:", permissions);

  if (!permissions || permissions.length === 0) {
    console.log("No permissions provided, returning empty array");
    return [] as string[];
  }

  const ids = new Set<string>();

  for (const group of permissions) {
    console.log("Processing permission group:", group);

    const categoryTrimmed = group.category.trim();
    if (!categoryTrimmed) {
      console.log("Empty category, skipping");
      continue;
    }

    const categoryOriginal = categoryTrimmed;
    const items = (group.items ?? []).map((item) => item.trim()).filter(Boolean);
    console.log("Processing items:", items);

    // Find existing permissions for this category (include soft-deleted so we can reactivate)
    console.log(
      "Looking for existing permissions in category (including deleted):",
      categoryOriginal,
    );
    const existingPermissions = await tx.permission.findMany({
      where: {
        category: categoryOriginal,
      },
    });
    console.log("Found existing permissions (including deleted):", existingPermissions);

    // Create a map of lowercased name -> permission object for case-insensitive matching
    const existingMap = new Map(existingPermissions.map((p) => [p.name.toLowerCase(), p]));
    console.log("Existing permissions map (lowercased):", Array.from(existingMap.keys()));

    // Upsert (create or reactivate) each permission
    for (const item of items) {
      console.log("Processing item:", item);
      const itemKey = item.toLowerCase();

      // If we already have this permission (including soft-deleted), use/reactivate it
      if (existingMap.has(itemKey)) {
        const existing = existingMap.get(itemKey)!;
        if (existing.deletedAt) {
          console.log("Reactivating soft-deleted permission:", existing.id);
          // Reactivate the permission (clear deletedAt)
          await tx.permission.update({
            where: { id: existing.id },
            data: { deletedAt: null },
          });
        } else {
          console.log("Found existing active permission, using ID:", existing.id);
        }

        ids.add(existing.id);
        continue;
      }

      // Otherwise create a new permission
      console.log("Creating new permission:", { category: categoryOriginal, name: item });
      const permission = await tx.permission.create({
        data: {
          category: categoryOriginal,
          name: item,
        },
      });
      console.log("Created new permission:", permission);

      ids.add(permission.id);
    }
  }

  const result = Array.from(ids.values());
  console.log("Final permission IDs:", result);
  return result;
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
