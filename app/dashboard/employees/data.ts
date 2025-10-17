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
    where: { deletedAt: null },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
}

export function getEmployeeById(id: string) {
  return prisma.employee.findUnique({
    where: { id, deletedAt: null },
    include: { user: true },
  });
}

export type EmployeeActivityItem = {
  id: string;
  code: string;
  title: string;
  createdAt: string; // ISO
  income: number;
  expense: number;
  days: number;
};

// Real activities sourced from Interactions created by the employee (user)
export async function getEmployeeActivities(employeeId: string): Promise<EmployeeActivityItem[]> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId, deletedAt: null },
    select: { userId: true },
  });
  if (!employee?.userId) return [];

  const interactions = await prisma.interaction.findMany({
    where: { deletedAt: null, createdById: employee.userId },
    include: {
      customer: { select: { id: true, customerType: true, companyName: true, prefix: true, firstName: true, lastName: true } },
    },
    orderBy: { date: "desc" },
    take: 300,
  });

  const results: EmployeeActivityItem[] = [];
  for (const it of interactions) {
    const date = it.date ?? new Date();
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    // Determine partner type and id
    let title = "กิจกรรม";
    let code = "-";
    const where: any = {};
    if (it.customer) {
      if (it.customer.customerType === "DEALER") title = "เข้าพบร้านค้า";
      else if (it.customer.customerType === "SUB_DEALER") title = "เข้าพบซับดีลเลอร์";
      else title = "เข้าพบเกษตรกร";
      code = "-";
      where.customerId = it.customer.id;
    }

    // Sum sales amount for the same partner in the month of the interaction
    const saleAgg = await prisma.sale.aggregate({
      _sum: { amount: true },
      where: { ...where, deletedAt: null, orderDate: { gte: monthStart, lte: monthEnd } },
    });

    const income = Number(saleAgg._sum.amount ?? 0);
    const expense = 0; // ไม่มีข้อมูลต้นทุน/รายจ่ายใน schema
    const days = Math.max(1, Math.ceil((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)));

    results.push({
      id: it.id,
      code,
      title,
      createdAt: date.toISOString(),
      income,
      expense,
      days,
    });
  }

  return results;
}

export async function getRoleDefinitionOptions(): Promise<RoleDefinitionOption[]> {
  const roles = await prisma.roleDefinition.findMany({
    where: { deletedAt: null },
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
