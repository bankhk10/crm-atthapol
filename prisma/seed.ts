import { prisma } from "../lib/prisma";
import bcrypt from "bcrypt";

import {
  ACTION_LABELS,
  PERMISSION_ACTIONS,
  type PermissionAction,
} from "@/lib/permissions";

type ModuleDefinition = {
  key: string;
  label: string;
};

type RoleSeed = {
  key: string;
  name: string;
  description: string;
  permissions: string[];
};

type UserSeed = {
  email: string;
  name: string;
  password: string;
  role: "ADMIN" | "MANAGER" | "USER";
  roleKey: string;
  employee?: {
    employeeCode: string;
    position: string;
    department: string;
    phone: string;
    startDate: Date;
  };
};

const resources: ModuleDefinition[] = [
  { key: "reports", label: "เมนูรายงาน" },
  { key: "activities", label: "กิจกรรม" },
  { key: "calendar", label: "ปฏิทิน" },
  { key: "map", label: "แผนที่" },
  { key: "products", label: "สินค้า" },
  { key: "sales", label: "การขาย" },
  { key: "marketing", label: "การตลาด" },
  { key: "customers", label: "ลูกค้า" },
  { key: "employees", label: "พนักงาน" },
  { key: "roles", label: "สิทธิ์" },
];

const allPermissionKeys = resources.flatMap((resource) =>
  PERMISSION_ACTIONS.map((action) => buildPermissionKey(resource.key, action)),
);

const approvalActions: PermissionAction[] = ["approve", "reject"];
const manageActions: PermissionAction[] = ["view", "create", "edit", "delete", ...approvalActions];
const contributeActions: PermissionAction[] = ["view", "create", "edit"];
const viewOnly: PermissionAction[] = ["view"];
const viewCreateActions: PermissionAction[] = ["view", "create"];

const roleSeeds: RoleSeed[] = [
  {
    key: "admin",
    name: "ผู้ดูแลระบบ",
    description: "เข้าถึงทุกเมนูและปุ่มคำสั่งทั้งหมด",
    permissions: allPermissionKeys,
  },
  {
    key: "marketing_manager",
    name: "ผู้จัดการการตลาด",
    description: "บริหารงานการตลาดและตรวจสอบข้อมูลแผนที่",
    permissions: [
      ...buildPermissionGroup("marketing", manageActions),
      ...buildPermissionGroup("map", viewOnly),
    ],
  },
  {
    key: "sales_manager",
    name: "ผู้จัดการการขาย",
    description: "ติดตามการขายและดูแลข้อมูลลูกค้าและสินค้า",
    permissions: [
      ...buildPermissionGroup("customers", manageActions),
      ...buildPermissionGroup("products", manageActions),
      ...buildPermissionGroup("marketing", viewOnly),
    ],
  },
  {
    key: "marketing_staff",
    name: "พนักงานการตลาด",
    description: "เข้าถึงเฉพาะงานภายในแผนกการตลาด",
    permissions: buildPermissionGroup("marketing", contributeActions),
  },
  {
    key: "sales_staff",
    name: "พนักงานฝ่ายขาย",
    description: "ดูแลข้อมูลลูกค้าและสินค้าเพื่อการขาย",
    permissions: [
      ...buildPermissionGroup("customers", contributeActions),
      ...buildPermissionGroup("products", viewCreateActions),
    ],
  },
];

const userSeeds: UserSeed[] = [
  {
    email: "bank@admin.com",
    name: "Admin",
    password: "bank@admin.com",
    role: "ADMIN",
    roleKey: "admin",
    employee: {
      employeeCode: "ADM-001",
      position: "System Administrator",
      department: "ผู้ดูแลระบบ",
      phone: "081-000-0001",
      startDate: new Date("2022-01-01"),
    },
  },
  {
    email: "marketing.manager@example.com",
    name: "ผู้จัดการการตลาด",
    password: "Marketing@123",
    role: "MANAGER",
    roleKey: "marketing_manager",
    employee: {
      employeeCode: "MKT-001",
      position: "ผู้จัดการการตลาด",
      department: "การตลาด",
      phone: "081-000-0002",
      startDate: new Date("2022-06-01"),
    },
  },
  {
    email: "sales.manager@example.com",
    name: "ผู้จัดการฝ่ายขาย",
    password: "SalesManager@123",
    role: "MANAGER",
    roleKey: "sales_manager",
    employee: {
      employeeCode: "SAL-001",
      position: "ผู้จัดการฝ่ายขาย",
      department: "การขาย",
      phone: "081-000-0003",
      startDate: new Date("2022-06-15"),
    },
  },
  {
    email: "marketing.staff@example.com",
    name: "เจ้าหน้าที่การตลาด",
    password: "MarketingStaff@123",
    role: "USER",
    roleKey: "marketing_staff",
    employee: {
      employeeCode: "MKT-002",
      position: "นักการตลาด",
      department: "การตลาด",
      phone: "081-000-0004",
      startDate: new Date("2023-01-10"),
    },
  },
  {
    email: "sales.staff@example.com",
    name: "เจ้าหน้าที่ฝ่ายขาย",
    password: "SalesStaff@123",
    role: "USER",
    roleKey: "sales_staff",
    employee: {
      employeeCode: "SAL-002",
      position: "เจ้าหน้าที่ฝ่ายขาย",
      department: "การขาย",
      phone: "081-000-0005",
      startDate: new Date("2023-02-01"),
    },
  },
];

function buildPermissionKey(resource: string, action: PermissionAction) {
  return `${resource}:${action}`;
}

function buildPermissionGroup(resource: string, actions: PermissionAction[]) {
  return actions.map((action) => buildPermissionKey(resource, action));
}

async function main() {
  const roleDefinitionIdMap = new Map<string, string>();

  // Ensure a system actor exists and set as audit actor for seeding
  const systemEmail = "system@local";
  const systemPassword = await bcrypt.hash("System@seed", 10);
  const systemUser = await prisma.user.upsert({
    where: { email: systemEmail },
    update: {
      name: "System",
      passwordHash: systemPassword,
      role: "ADMIN",
    },
    create: {
      email: systemEmail,
      name: "System",
      passwordHash: systemPassword,
      role: "ADMIN",
    },
  });
  process.env.AUDIT_ACTOR_USER_ID = systemUser.id;

  await prisma.$transaction(async (tx) => {
    // Ensure permissions exist
    const permissionIdMap = new Map<string, string>();
    for (const resource of resources) {
      for (const action of PERMISSION_ACTIONS) {
        const permission = await tx.permission.upsert({
          where: { category_name: { category: resource.key, name: action } },
          update: {
            description: `${ACTION_LABELS[action]} - ${resource.label}`,
          },
          create: {
            category: resource.key,
            name: action,
            description: `${ACTION_LABELS[action]} - ${resource.label}`,
          },
        });
        permissionIdMap.set(buildPermissionKey(resource.key, action), permission.id);
      }
    }

    for (const role of roleSeeds) {
      const roleDefinition = await tx.roleDefinition.upsert({
        where: { key: role.key },
        update: {
          name: role.name,
          description: role.description,
        },
        create: {
          key: role.key,
          name: role.name,
          description: role.description,
        },
      });

      roleDefinitionIdMap.set(role.key, roleDefinition.id);

      await tx.rolePermission.deleteMany({ where: { roleId: roleDefinition.id } });
      const permissionIds = Array.from(
        new Set(
          role.permissions
            .map((key) => permissionIdMap.get(key))
            .filter((value): value is string => Boolean(value)),
        ),
      );

      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId: roleDefinition.id,
            permissionId,
          })),
          skipDuplicates: true,
        });
      }
    }
  });

  for (const userSeed of userSeeds) {
    const roleDefinitionId = roleDefinitionIdMap.get(userSeed.roleKey);
    if (!roleDefinitionId) {
      throw new Error(`Missing role definition for key ${userSeed.roleKey}`);
    }

    const passwordHash = await bcrypt.hash(userSeed.password, 10);

    const user = await prisma.user.upsert({
      where: { email: userSeed.email },
      update: {
        name: userSeed.name,
        passwordHash,
        role: userSeed.role,
        roleDefinitionId,
      },
      create: {
        email: userSeed.email,
        name: userSeed.name,
        passwordHash,
        role: userSeed.role,
        roleDefinitionId,
      },
    });

    // Set audit actor for subsequent seed writes using this admin user
    if (!process.env.AUDIT_ACTOR_USER_ID && userSeed.role === "ADMIN") {
      process.env.AUDIT_ACTOR_USER_ID = user.id;
    }

    if (userSeed.employee) {
      const employee = userSeed.employee;
      await prisma.employee.upsert({
        where: { userId: user.id },
        update: {
          position: employee.position,
          department: employee.department,
          phone: employee.phone,
          startDate: employee.startDate,
          status: "ACTIVE",
        },
        create: {
          userId: user.id,
          employeeCode: employee.employeeCode,
          position: employee.position,
          department: employee.department,
          phone: employee.phone,
          startDate: employee.startDate,
          status: "ACTIVE",
        },
      });
    }

    console.log(
      `✅ Seeded user ${userSeed.email} (${userSeed.roleKey}) with password ${userSeed.password}`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
