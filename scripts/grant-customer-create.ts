#!/usr/bin/env tsx
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL },
  },
});

type TypeKey = "all" | "dealer" | "subdealer" | "farmer" | "broker";
const ALL_TYPES: TypeKey[] = ["all", "dealer", "subdealer", "farmer", "broker"];

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

async function ensureCustomerCreatePermissions() {
  for (const name of ALL_TYPES) {
    await prisma.permission.upsert({
      where: { category_name: { category: "customers_create", name } },
      update: {},
      create: {
        category: "customers_create",
        name,
        description: `สร้างลูกค้า ${name.toUpperCase()}`,
      },
    });
  }
}

async function main() {
  const roleKey = parseArg("role-key");
  const typesArg = parseArg("types");
  if (!roleKey || !typesArg) {
    console.error("Usage: tsx scripts/grant-customer-create.ts --role-key=<key> --types=dealer,subdealer,farmer,broker");
    process.exit(1);
  }
  const types = typesArg.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) as TypeKey[];
  for (const t of types) {
    if (!ALL_TYPES.includes(t)) {
      console.error(`Invalid type: ${t}. Allowed: ${ALL_TYPES.join(",")}`);
      process.exit(1);
    }
  }

  await ensureCustomerCreatePermissions();

  const role = await prisma.roleDefinition.findUnique({ where: { key: roleKey } });
  if (!role) {
    console.error(`RoleDefinition not found for key: ${roleKey}`);
    process.exit(1);
  }

  // Fetch permission ids for requested types
  const perms = await prisma.permission.findMany({
    where: { category: "customers_create", name: { in: types } },
    select: { id: true, name: true },
  });
  const toAddIds = perms.map((p) => p.id);

  // Attach (skip duplicates)
  if (toAddIds.length) {
    await prisma.rolePermission.createMany({
      data: toAddIds.map((pid) => ({ roleId: role.id, permissionId: pid })),
      skipDuplicates: true,
    });
  }

  console.log(`✅ Granted customers_create [${types.join(", ")}] to role ${roleKey}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
