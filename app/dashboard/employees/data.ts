import { prisma } from "@/lib/prisma";

import type { EmployeeRoleOption, PermissionGroup, RoleDefinitionOption } from "./types";

type GroupablePermission = {
  category: string;
  name: string;
};

export const employeeRoleOptions: EmployeeRoleOption[] = [
  {
    value: "ADMIN",
    label: "ผู้ดูแลระบบ",
    description: "เข้าถึงและจัดการทุกส่วนของระบบ",
  },
  {
    value: "MANAGER",
    label: "ผู้จัดการ",
    description: "ดูแลทีม ตรวจสอบรายงาน และจัดการข้อมูลสำคัญ",
  },
  {
    value: "USER",
    label: "ผู้ใช้งานทั่วไป",
    description: "ใช้งานฟีเจอร์พื้นฐานตามสิทธิ์ที่กำหนด",
  },
];

export function getEmployees() {
  return prisma.employee.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
}

export function getEmployeeById(id: string) {
  return prisma.employee.findUnique({
    where: { id },
    include: { user: true },
  });
}

export async function getRoleDefinitionOptions(): Promise<RoleDefinitionOption[]> {
  const roles = await prisma.roleDefinition.findMany({
    include: {
      permissions: {
        include: {
          permission: true,
        },
        orderBy: {
          permission: {
            category: "asc",
          },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return roles.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: groupPermissions(
      role.permissions.map((assignment) => ({
        category: assignment.permission.category,
        name: assignment.permission.name,
      })),
    ),
  }));
}

function groupPermissions(permissions: GroupablePermission[]): PermissionGroup[] {
  const map = new Map<string, Set<string>>();

  permissions.forEach((permission) => {
    const category = permission.category.trim();
    const name = permission.name.trim();

    if (!category || !name) {
      return;
    }

    if (!map.has(category)) {
      map.set(category, new Set());
    }

    map.get(category)!.add(name);
  });

  return Array.from(map.entries())
    .map(([category, items]) => ({
      category,
      items: Array.from(items.values()).sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.category.localeCompare(b.category));
}
