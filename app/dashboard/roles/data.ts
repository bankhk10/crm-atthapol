import { prisma } from "@/lib/prisma";

import type { PermissionLibraryGroup, RoleListItem } from "./types";

type GroupablePermission = {
  category: string;
  name: string;
};

export async function getRoleList(): Promise<RoleListItem[]> {
  const roles = await fetchRolesFromDb();

  return roles.map((role) => ({
    id: role.id,
    key: role.key,
    name: role.name,
    description: role.description,
    assignedUsers: role._count.users,
    permissions: groupPermissions(
      role.permissions.map((assignment) => ({
        category: assignment.permission.category,
        name: assignment.permission.name,
      })),
    ),
    createdAt: role.createdAt.toISOString(),
  }));
}

export async function getPermissionLibrary(): Promise<PermissionLibraryGroup[]> {
  const permissions = await prisma.permission.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return groupPermissions(permissions).map((group) => ({
    category: group.category,
    items: group.items,
  }));
}

async function fetchRolesFromDb() {
  return prisma.roleDefinition.findMany({
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
      _count: {
        select: { users: true },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

function groupPermissions(permissions: GroupablePermission[]): { category: string; items: string[] }[] {
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