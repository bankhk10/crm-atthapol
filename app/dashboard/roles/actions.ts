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
  console.log('Starting createRole with values:', rawValues);
  
  const values = roleFormSchema.parse(rawValues);
  console.log('After schema parsing:', values);

  try {
    await withActor(async () => {
      await prisma.$transaction(async (tx) => {
        console.log('Creating role with data:', {
          key: values.key,
          name: values.name,
          description: values.description,
          department: values.department
        });

        const role = await tx.roleDefinition.create({
          data: {
            key: values.key,
            name: values.name,
            description: values.description || null,
            department: values.department ? values.department : null,
          },
        });
        console.log('Created role:', role);

        console.log('Creating permissions for role, input permissions:', values.permissions);
        const permissionIds = await upsertPermissions(tx, values.permissions);
        console.log('Generated permission IDs:', permissionIds);

        if (permissionIds.length > 0) {
          const rolePermissions = permissionIds.map((permissionId) => ({
            roleId: role.id,
            permissionId,
          }));
          console.log('Creating role permissions:', rolePermissions);

          await tx.rolePermission.createMany({
            data: rolePermissions,
            skipDuplicates: true,
          });
        }
      });
    }).catch((error) => {
      console.error('Error in createRole:', error);
      throw error;
    });

    console.log('Role creation completed successfully');
    revalidateRoleViews();
  } catch (error) {
    console.error('Error in outer try-catch:', error);
    throw error;
  }
}

export async function updateRole(roleId: string, rawValues: RoleFormValues) {
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
          NOT: { permissionId: { in: permissionIds } }
        },
        data: { deletedAt: new Date() }
      });

      // Add new permissions
      if (permissionIds.length > 0) {
        // Find existing valid permission assignments
        const existingAssignments = existingRole.permissions
          .filter(p => !p.deletedAt)
          .map(p => p.permissionId);

        // Only create new assignments for permissions that don't exist
        const newPermissionIds = permissionIds.filter(
          id => !existingAssignments.includes(id)
        );

        if (newPermissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: newPermissionIds.map((permissionId) => ({
              roleId: roleId,
              permissionId
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
  console.log('Starting upsertPermissions with permissions:', permissions);

  if (!permissions || permissions.length === 0) {
    console.log('No permissions provided, returning empty array');
    return [] as string[];
  }

  const ids = new Set<string>();

  for (const group of permissions) {
    console.log('Processing permission group:', group);

    const categoryTrimmed = group.category.trim();
    if (!categoryTrimmed) {
      console.log('Empty category, skipping');
      continue;
    }

    const categoryOriginal = categoryTrimmed;
    const items = (group.items ?? []).map(item => item.trim()).filter(Boolean);
    console.log('Processing items:', items);

    // Find existing permissions for this category
    console.log('Looking for existing permissions in category:', categoryOriginal);
    const existingPermissions = await tx.permission.findMany({
      where: {
        category: categoryOriginal,
        deletedAt: null,
      },
    });
    console.log('Found existing permissions:', existingPermissions);

    // Create a map of name to existing permission
    const existingMap = new Map(
      existingPermissions.map(p => [p.name, p.id])
    );
    console.log('Existing permissions map:', Object.fromEntries(existingMap));

    // Upsert each permission
    for (const item of items) {
      console.log('Processing item:', item);
      
      // If we already have this permission, just use its ID
      if (existingMap.has(item)) {
        const existingId = existingMap.get(item)!;
        console.log('Found existing permission, using ID:', existingId);
        ids.add(existingId);
        continue;
      }

      // Otherwise create a new permission
      console.log('Creating new permission:', { category: categoryOriginal, name: item });
      const permission = await tx.permission.create({
        data: {
          category: categoryOriginal,
          name: item,
        },
      });
      console.log('Created new permission:', permission);

      ids.add(permission.id);
    }
  }

  const result = Array.from(ids.values());
  console.log('Final permission IDs:', result);
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
