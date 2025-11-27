import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL },
  },
});
import bcrypt from "bcrypt";

import { ACTION_LABELS, PERMISSION_ACTIONS, type PermissionAction } from "@/lib/permissions";

type ModuleDefinition = {
  key: string;
  label: string;
};

type RoleSeed = {
  key: string;
  name: string;
  description: string;
  department?: string;
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

function buildPermissionKey(resource: string, action: PermissionAction) {
  return `${resource}:${action}`;
}

function buildPermissionGroup(resource: string, actions: PermissionAction[]) {
  return actions.map((action) => buildPermissionKey(resource, action));
}

// Default permission groups
const approvalActions: PermissionAction[] = ["approve", "reject"];
const manageActions: PermissionAction[] = ["view", "create", "edit", "delete", ...approvalActions];
const contributeActions: PermissionAction[] = ["view", "create", "edit"];
const viewCreateActions: PermissionAction[] = ["view", "create"];

// Roles
const allPermissionKeys = resources.flatMap((r) =>
  PERMISSION_ACTIONS.map((a) => buildPermissionKey(r.key, a)),
);

const roleSeeds: RoleSeed[] = [
  {
    key: "admin",
    name: "ผู้ดูแลระบบ",
    description: "เข้าถึงทุกเมนูและปุ่มคำสั่งทั้งหมด",
    department: "แผนกเทคโนโลยีสารสนเทศ",
    permissions: [
      ...allPermissionKeys,
      // Visibility scope: admin sees all
      "sales_scope:all",
      // All customer type creates
      "customers_create:all",
      // UI features
      "ui:random_fill",
      // UI features
      "employees_ui:random_fill",
    ],
  },
  {
    key: "sales_manager",
    name: "ผู้จัดการฝ่ายขาย",
    description: "ติดตามการขายและดูแลข้อมูลลูกค้าและสินค้า",
    department: "แผนกบริหารงานขาย",
    permissions: [
      ...buildPermissionGroup("customers", manageActions),
      ...buildPermissionGroup("products", manageActions),
      ...buildPermissionGroup("sales", manageActions),
      // Visibility scope: manager sees department
      "sales_scope:department",
      // Allowed customer types for create
      "customers_create:subdealer",
      "customers_create:farmer",
    ],
  },
  {
    key: "sales_staff",
    name: "พนักงานฝ่ายขาย",
    description: "ดูแลข้อมูลลูกค้าและบันทึกยอดขาย",
    department: "แผนกบริหารงานขาย",
    permissions: [
      ...buildPermissionGroup("customers", contributeActions),
      ...buildPermissionGroup("sales", viewCreateActions),
      // Visibility scope: staff sees own
      "sales_scope:own",
      // Allowed customer types for create
      "customers_create:dealer",
    ],
  },
];

const userSeeds: UserSeed[] = [
  {
    email: "b@b.com",
    name: "System Admin",
    password: "b@b.com",
    role: "ADMIN",
    roleKey: "admin",
    employee: {
      employeeCode: "EMP-0000",
      position: "ผู้ดูแลระบบ",
      department: "แผนกเทคโนโลยีสารสนเทศ",
      phone: "0810000001",
      startDate: new Date("2024-01-01"),
    },
  },
  {
    email: "admin@csone.local",
    name: "System Admin",
    password: "Admin@123",
    role: "ADMIN",
    roleKey: "admin",
    employee: {
      employeeCode: "EMP-0001",
      position: "ผู้ดูแลระบบ",
      department: "แผนกเทคโนโลยีสารสนเทศ",
      phone: "0810000001",
      startDate: new Date("2024-01-01"),
    },
  },
  {
    email: "sales.manager@csone.local",
    name: "ผู้จัดการฝ่ายขาย",
    password: "SalesManager@123",
    role: "MANAGER",
    roleKey: "sales_manager",
    employee: {
      employeeCode: "EMP-0002",
      position: "ผู้จัดการฝ่ายขาย",
      department: "แผนกบริหารงานขาย",
      phone: "0810000002",
      startDate: new Date("2024-03-01"),
    },
  },
  {
    email: "sales.staff@csone.local",
    name: "พนักงานฝ่ายขาย",
    password: "SalesStaff@123",
    role: "USER",
    roleKey: "sales_staff",
    employee: {
      employeeCode: "EMP-0003",
      position: "เจ้าหน้าที่ฝ่ายขาย",
      department: "แผนกบริหารงานขาย",
      phone: "0810000003",
      startDate: new Date("2024-06-01"),
    },
  },
  // USER A: can create Dealer only (sales_staff role)
  {
    email: "user.a@csone.local",
    name: "USER A",
    password: "UserA@123",
    role: "USER",
    roleKey: "sales_staff",
    employee: {
      employeeCode: "EMP-0004",
      position: "เจ้าหน้าที่ฝ่ายขาย",
      department: "แผนกบริหารงานขาย",
      phone: "0810000004",
      startDate: new Date("2024-07-01"),
    },
  },
  // USER B: can create SubDealer + Farmer (sales_manager role)
  {
    email: "user.b@csone.local",
    name: "USER B",
    password: "UserB@123",
    role: "MANAGER",
    roleKey: "sales_manager",
    employee: {
      employeeCode: "EMP-0005",
      position: "ผู้จัดการฝ่ายขาย",
      department: "แผนกบริหารงานขาย",
      phone: "0810000005",
      startDate: new Date("2024-07-15"),
    },
  },
];

async function main() {
  console.log("🌱 Start seeding...");

  // ---------------------------
  // 1️⃣ สร้าง SYSTEM USER
  // ---------------------------
  const systemEmail = "system@local";
  const systemPassword = await bcrypt.hash("System@seed", 10);
  const systemUser = await prisma.user.upsert({
    where: { email: systemEmail },
    update: { name: "System", passwordHash: systemPassword, role: "ADMIN" },
    create: { email: systemEmail, name: "System", passwordHash: systemPassword, role: "ADMIN" },
  });
  process.env.AUDIT_ACTOR_USER_ID = systemUser.id;

  // ---------------------------
  // 2️⃣ สร้าง Permissions / Roles
  // ---------------------------
  const roleDefinitionIdMap = new Map<string, string>();
  const permissionIdMap = new Map<string, string>();

  await prisma.$transaction(
    async (tx) => {
      for (const resource of resources) {
        for (const action of PERMISSION_ACTIONS) {
          const permission = await tx.permission.upsert({
            where: { category_name: { category: resource.key, name: action } },
            update: { description: `${ACTION_LABELS[action]} - ${resource.label}` },
            create: {
              category: resource.key,
              name: action,
              description: `${ACTION_LABELS[action]} - ${resource.label}`,
            },
          });
          permissionIdMap.set(buildPermissionKey(resource.key, action), permission.id);
        }
      }

      // Add explicit sales visibility scope permissions (not part of PERMISSION_ACTIONS)
      const scopeDefs = [
        { category: "sales_scope", name: "own", description: "เห็นเฉพาะที่ตัวเองรับผิดชอบ" },
        { category: "sales_scope", name: "department", description: "เห็นเฉพาะแผนกตนเอง" },
        { category: "sales_scope", name: "all", description: "เห็นทั้งหมด" },
      ];
      for (const s of scopeDefs) {
        const perm = await tx.permission.upsert({
          where: { category_name: { category: s.category, name: s.name } },
          update: { description: s.description },
          create: s,
        });
        permissionIdMap.set(`${s.category}:${s.name}`, perm.id);
      }

      // Add UI feature flags as permissions
      const uiPerms = [
        { category: "ui", name: "random_fill", description: "ใช้ปุ่มกรอกแบบสุ่ม (ทุกหน้า)" },
        {
          category: "employees_ui",
          name: "random_fill",
          description: "ใช้ปุ่มกรอกแบบสุ่มในหน้าพนักงาน",
        },
      ];
      for (const u of uiPerms) {
        const perm = await tx.permission.upsert({
          where: { category_name: { category: u.category, name: u.name } },
          update: { description: u.description },
          create: u,
        });
        permissionIdMap.set(`${u.category}:${u.name}`, perm.id);
      }

      // Add fine-grained customer create permissions by type
      const customerCreateTypes = [
        { name: "all", description: "สร้างลูกค้าทุกประเภท" },
        { name: "dealer", description: "สร้างลูกค้า Dealer" },
        { name: "subdealer", description: "สร้างลูกค้า SubDealer" },
        { name: "farmer", description: "สร้างลูกค้า Farmer" },
        { name: "broker", description: "สร้างลูกค้า Broker" },
      ];
      for (const t of customerCreateTypes) {
        const perm = await tx.permission.upsert({
          where: { category_name: { category: "customers_create", name: t.name } },
          update: { description: t.description },
          create: { category: "customers_create", name: t.name, description: t.description },
        });
        permissionIdMap.set(`customers_create:${t.name}`, perm.id);
      }

      for (const role of roleSeeds) {
        const roleDef = await tx.roleDefinition.upsert({
          where: { key: role.key },
          update: {
            name: role.name,
            description: role.description,
            department: role.department ?? null,
          },
          create: {
            key: role.key,
            name: role.name,
            description: role.description,
            department: role.department ?? null,
          },
        });

        roleDefinitionIdMap.set(role.key, roleDef.id);
        await tx.rolePermission.deleteMany({ where: { roleId: roleDef.id } });

        const permissionIds = role.permissions
          .map((k) => permissionIdMap.get(k))
          .filter((v): v is string => !!v);

        await tx.rolePermission.createMany({
          data: permissionIds.map((pid) => ({ roleId: roleDef.id, permissionId: pid })),
          skipDuplicates: true,
        });
      }
    },
    { maxWait: 30000, timeout: 60000 },
  );

  // ---------------------------
  // 3️⃣ สร้าง Users + Employees
  // ---------------------------
  const employees: Record<string, { id: string; code?: string }> = {};
  const usersByEmail: Record<string, string> = {};

  for (const u of userSeeds) {
    const roleDefinitionId = roleDefinitionIdMap.get(u.roleKey)!;
    const passwordHash = await bcrypt.hash(u.password, 10);

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, passwordHash, role: u.role, roleDefinitionId },
      create: {
        email: u.email,
        name: u.name,
        passwordHash,
        role: u.role,
        roleDefinitionId,
      },
    });

    if (u.employee) {
      const emp = await prisma.employee.upsert({
        where: { userId: user.id },
        update: {
          position: u.employee.position,
          department: u.employee.department,
          phone: u.employee.phone,
          startDate: u.employee.startDate,
          status: "ACTIVE",
        },
        create: {
          userId: user.id,
          employeeCode: u.employee.employeeCode,
          position: u.employee.position,
          department: u.employee.department,
          phone: u.employee.phone,
          startDate: u.employee.startDate,
          status: "ACTIVE",
        },
      });
      employees[user.email as string] = { id: emp.id, code: u.employee.employeeCode };
    }

    usersByEmail[u.email] = user.id;

    console.log(`✅ Created user ${u.email} (${u.roleKey})`);
  }

  // ---------------------------
  // 4️⃣ สร้างข้อมูลพืช
  // ---------------------------
  const plantNames = [
    "ข้าว",
    "ข้าวโพด",
    "อ้อย",
    "มันสำปะหลัง",
    "ยางพารา",
    "ปาล์มน้ำมัน",
    "ทุเรียน",
    "มังคุด",
    "ลำไย",
    "มะม่วง",
  ];

  for (const name of plantNames) {
    await prisma.plant.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`🌱 Seeded ${plantNames.length} plants`);

  // ---------------------------
  await prisma.sale.deleteMany({ where: { productName: { startsWith: "SEED-" } } });
  await prisma.interaction.deleteMany({ where: { notes: { startsWith: "SEED" } } });

  const year = new Date().getFullYear();
  const channels = ["VISIT", "CALL", "EMAIL", "LINE"] as const;

  const salesData: any[] = [];
  const interactionsData: any[] = [];

  await prisma.sale.createMany({ data: salesData });
  await prisma.interaction.createMany({ data: interactionsData });

  console.log(
    `🌾 Seeded monthly Sales (${salesData.length}) and Interactions (${interactionsData.length}) for year ${year}.`,
  );

  // ---------------------------
  // 7️⃣ ตัวอย่าง Sales Notes เพื่อจำลอง workflow
  // ---------------------------
  // รองรับกรณี client ยังไม่ regenerate โดยใช้ (prisma as any) และ fallback เป็น RAW SQL
  const snDelegate = (prisma as any).salesNote as
    | { deleteMany: (args: any) => Promise<any>; create: (args: any) => Promise<any> }
    | undefined;

  if (snDelegate) {
    await snDelegate.deleteMany({ where: { noteNumber: { startsWith: "SN-SEED-" } } });
  } else {
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM "SalesNote" WHERE "noteNumber" LIKE 'SN-SEED-%'`);
    } catch {}
  }
  // ---------------------------
  // 8️⃣ สร้างคลังสินค้า + ตำแหน่งเก็บ (Master Data)
  // ---------------------------
  const warehouseSeeds = [
    {
      code: "MAIN",
      name: "คลังหลัก",
      locations: [{ code: "MAIN-01", name: "คลังบางเลน" }],
    },
  ];

  for (const wh of warehouseSeeds) {
    const w = await prisma.warehouse.upsert({
      where: { code: wh.code },
      update: { name: wh.name },
      create: { code: wh.code, name: wh.name },
    });
    for (const loc of wh.locations) {
      await prisma.warehouseLocation.upsert({
        where: {
          warehouseId_name: {
            warehouseId: w.id,
            name: loc.name,
          },
        },
        update: { code: loc.code ?? null },
        create: { warehouseId: w.id, code: loc.code ?? null, name: loc.name },
      });
    }
  }
  console.log("🏬 Seeded Warehouses and Locations");

  // ---------------------------
  // 9️⃣ สร้างตัวอย่าง Sales Forecasts สำหรับพนักงานขายที่ seed ไว้
  // ---------------------------
  const salesEmployees = Object.entries(employees).filter(([, info]) => Boolean(info?.id));
  if (salesEmployees.length > 0) {
    const forecastYear = year;
    const monthTemplates = Array.from({ length: 12 }, (_, idx) => {
      const baseRevenue = 80000 + idx * 3500;
      const baseQuantity = 40 + idx * 4;
      return {
        month: idx + 1,
        targetRevenue: baseRevenue,
        targetQuantity: baseQuantity,
        note: idx % 3 === 0 ? "Seed target" : undefined,
        lines: [
          {
            channel: "FIELD",
            expectedQuantity: Math.max(5, Math.round(baseQuantity * 0.6)),
            expectedRevenue: Math.round(baseRevenue * 0.5),
            note: "Seed baseline line",
          },
        ],
      };
    });
    const totalRevenue = monthTemplates.reduce((sum, m) => sum + m.targetRevenue, 0);
    const totalQuantity = monthTemplates.reduce((sum, m) => sum + m.targetQuantity, 0);

    let forecastCount = 0;
    for (const [email, info] of salesEmployees) {
      if (!info?.id) continue;
      const rawSuffix = (info.code || email.split("@")[0] || "OWNER").toUpperCase();
      const safeSuffix = rawSuffix.replace(/[^A-Z0-9]/g, "");
      const forecastName = `SEED-FC-${forecastYear}-${safeSuffix || "OWNER"}`;

      const baseData = {
        name: forecastName,
        year: forecastYear,
        currency: "THB",
        salespersonId: info.id,
        status: "DRAFT" as const,
        notes: "Seed forecast baseline",
        totalRevenueTarget: totalRevenue,
        totalQuantityTarget: totalQuantity,
        submittedAt: null,
        approvedAt: null,
        approvedByUserId: null,
        rejectedReason: null,
      };

      const record = await prisma.forecast.upsert({
        where: {
          salespersonId_year_name: {
            salespersonId: info.id,
            year: forecastYear,
            name: forecastName,
          },
        },
        update: baseData,
        create: baseData,
      });

      await prisma.forecastMonth.deleteMany({ where: { forecastId: record.id } });
      for (const tpl of monthTemplates) {
        await prisma.forecastMonth.create({
          data: {
            forecastId: record.id,
            month: tpl.month,
            targetRevenue: tpl.targetRevenue,
            targetQuantity: tpl.targetQuantity,
            note: tpl.note,
            lines: { create: tpl.lines },
          },
        });
      }
      forecastCount += 1;
    }

    console.log(`📈 Seeded ${forecastCount} sales forecasts for ${forecastYear}.`);
  }
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
