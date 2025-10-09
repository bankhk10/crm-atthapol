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
const viewOnly: PermissionAction[] = ["view"];
const viewCreateActions: PermissionAction[] = ["view", "create"];

// Roles
const allPermissionKeys = resources.flatMap((r) =>
  PERMISSION_ACTIONS.map((a) => buildPermissionKey(r.key, a))
);

const roleSeeds: RoleSeed[] = [
  {
    key: "admin",
    name: "ผู้ดูแลระบบ",
    description: "เข้าถึงทุกเมนูและปุ่มคำสั่งทั้งหมด",
    permissions: allPermissionKeys,
  },
  {
    key: "sales_manager",
    name: "ผู้จัดการฝ่ายขาย",
    description: "ติดตามการขายและดูแลข้อมูลลูกค้าและสินค้า",
    permissions: [
      ...buildPermissionGroup("customers", manageActions),
      ...buildPermissionGroup("products", manageActions),
      ...buildPermissionGroup("sales", manageActions),
    ],
  },
  {
    key: "sales_staff",
    name: "พนักงานฝ่ายขาย",
    description: "ดูแลข้อมูลลูกค้าและบันทึกยอดขาย",
    permissions: [
      ...buildPermissionGroup("customers", contributeActions),
      ...buildPermissionGroup("sales", viewCreateActions),
    ],
  },
];

const userSeeds: UserSeed[] = [
  {
    email: "admin@csone.local",
    name: "System Admin",
    password: "Admin@123",
    role: "ADMIN",
    roleKey: "admin",
    employee: {
      employeeCode: "EMP-0001",
      position: "ผู้ดูแลระบบ",
      department: "IT",
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
      department: "การขาย",
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
      department: "การขาย",
      phone: "0810000003",
      startDate: new Date("2024-06-01"),
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

  await prisma.$transaction(async (tx) => {
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

    for (const role of roleSeeds) {
      const roleDef = await tx.roleDefinition.upsert({
        where: { key: role.key },
        update: { name: role.name, description: role.description },
        create: { key: role.key, name: role.name, description: role.description },
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
  });

  // ---------------------------
  // 3️⃣ สร้าง Users + Employees
  // ---------------------------
  const employees: Record<string, string> = {};
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
      employees[user.email as string] = emp.id;
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
  // 5️⃣ สร้าง Dealer / SubDealer / Farmer ตัวอย่าง (idempotent)
  // ---------------------------
  const dealer = await prisma.dealer.upsert({
    where: { code: "DLR-0001" },
    update: {
      name: "บริษัท สมบูรณ์เกษตรภัณฑ์ จำกัด",
      taxId: "0105556789012",
      phone: "029999999",
      province: "นนทบุรี",
      responsibleEmployeeId: employees["sales.manager@csone.local"],
    },
    create: {
      code: "DLR-0001",
      name: "บริษัท สมบูรณ์เกษตรภัณฑ์ จำกัด",
      taxId: "0105556789012",
      phone: "029999999",
      province: "นนทบุรี",
      responsibleEmployeeId: employees["sales.manager@csone.local"],
    },
  });
  await prisma.businessInfo.upsert({
    where: { dealerId: dealer.id },
    update: { creditTerm: 60, creditLimit: 500000, salesTarget: 1000000 },
    create: { dealerId: dealer.id, creditTerm: 60, creditLimit: 500000, salesTarget: 1000000 },
  });

  const subDealer = await prisma.subDealer.upsert({
    where: { code: "SBD-0001" },
    update: {
      name: "ร้านรุ่งเรืองเกษตรภัณฑ์",
      phone: "0811112222",
      province: "ราชบุรี",
      dealerId: dealer.id,
      responsibleEmployeeId: employees["sales.staff@csone.local"],
    },
    create: {
      code: "SBD-0001",
      name: "ร้านรุ่งเรืองเกษตรภัณฑ์",
      phone: "0811112222",
      province: "ราชบุรี",
      dealerId: dealer.id,
      responsibleEmployeeId: employees["sales.staff@csone.local"],
    },
  });
  await prisma.businessInfo.upsert({
    where: { subDealerId: subDealer.id },
    update: { creditTerm: 30, creditLimit: 150000, salesTarget: 300000 },
    create: { subDealerId: subDealer.id, creditTerm: 30, creditLimit: 150000, salesTarget: 300000 },
  });

  const farmer = await prisma.farmer.upsert({
    where: { code: "FRM-0001" },
    update: {
      name: "นายสมชาย เกษตรกรดีเด่น",
      phone: "0892223333",
      province: "กาญจนบุรี",
      cropType: "ข้าวโพด",
      farmName: "ไร่สมชาย",
      farmSize: 45,
      subDealerId: subDealer.id,
      responsibleEmployeeId: employees["sales.staff@csone.local"],
    },
    create: {
      code: "FRM-0001",
      name: "นายสมชาย เกษตรกรดีเด่น",
      phone: "0892223333",
      province: "กาญจนบุรี",
      cropType: "ข้าวโพด",
      farmName: "ไร่สมชาย",
      farmSize: 45,
      subDealerId: subDealer.id,
      responsibleEmployeeId: employees["sales.staff@csone.local"],
    },
  });
  await prisma.businessInfo.upsert({
    where: { farmerId: farmer.id },
    update: { areaSize: 45, cropType: "ข้าวโพด", season: "ฤดูฝน 2567" },
    create: { farmerId: farmer.id, areaSize: 45, cropType: "ข้าวโพด", season: "ฤดูฝน 2567" },
  });

  // ---------------------------
  // 6️⃣ ตัวอย่าง Sale / Interaction ครอบคลุมทุกเดือนของปีปัจจุบัน
  //     - ลบชุด SEED เดิมก่อนเพื่อ rerun ได้ปลอดภัย
  // ---------------------------
  await prisma.sale.deleteMany({ where: { productName: { startsWith: "SEED-" } } });
  await prisma.interaction.deleteMany({ where: { notes: { startsWith: "SEED" } } });

  const year = new Date().getFullYear();
  const channels = ["VISIT", "CALL", "EMAIL", "LINE"] as const;

  const salesData: any[] = [];
  const interactionsData: any[] = [];

  for (let m = 0; m < 12; m++) {
    const lastDay = new Date(year, m + 1, 0).getDate();
    const midDay = Math.min(15, lastDay);
    const earlyDay = Math.min(5, lastDay);

    // Dealer — ผู้จัดการฝ่ายขายดูแล
    salesData.push({
      dealerId: dealer.id,
      orderDate: new Date(year, m, midDay),
      productName: `SEED-Dealer Product M${m + 1}`,
      quantity: 100 + m * 5,
      amount: 30000 + m * 2500,
      paymentStatus: m % 3 === 0 ? "PAID" : "PENDING",
    });
    interactionsData.push({
      dealerId: dealer.id,
      date: new Date(year, m, earlyDay),
      channel: channels[m % channels.length],
      notes: `SEED ${year}-${String(m + 1).padStart(2, "0")} Dealer`,
      createdById: usersByEmail["sales.manager@csone.local"],
    });

    // SubDealer — พนักงานฝ่ายขายดูแล
    salesData.push({
      subDealerId: subDealer.id,
      orderDate: new Date(year, m, Math.min(midDay + 2, lastDay)),
      productName: `SEED-SubDealer Product M${m + 1}`,
      quantity: 50 + m * 3,
      amount: 15000 + m * 1500,
      paymentStatus: m % 2 === 0 ? "PAID" : "PENDING",
    });
    interactionsData.push({
      subDealerId: subDealer.id,
      date: new Date(year, m, Math.min(earlyDay + 2, lastDay)),
      channel: channels[(m + 1) % channels.length],
      notes: `SEED ${year}-${String(m + 1).padStart(2, "0")} SubDealer`,
      createdById: usersByEmail["sales.staff@csone.local"],
    });

    // Farmer — พนักงานฝ่ายขายดูแล
    salesData.push({
      farmerId: farmer.id,
      orderDate: new Date(year, m, Math.min(midDay + 4, lastDay)),
      productName: `SEED-Farmer Product M${m + 1}`,
      quantity: 10 + m,
      amount: 5000 + m * 500,
      paymentStatus: "PAID",
    });
    interactionsData.push({
      farmerId: farmer.id,
      date: new Date(year, m, Math.min(earlyDay + 4, lastDay)),
      channel: channels[(m + 2) % channels.length],
      notes: `SEED ${year}-${String(m + 1).padStart(2, "0")} Farmer`,
      createdById: usersByEmail["sales.staff@csone.local"],
    });
  }

  await prisma.sale.createMany({ data: salesData });
  await prisma.interaction.createMany({ data: interactionsData });

  console.log(`🌾 Seeded monthly Sales (${salesData.length}) and Interactions (${interactionsData.length}) for year ${year}.`);
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
