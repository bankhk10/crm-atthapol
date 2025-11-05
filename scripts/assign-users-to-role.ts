#!/usr/bin/env tsx
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL },
  },
});

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

async function main() {
  const roleKey = parseArg("role-key");
  const emailsArg = parseArg("emails");
  if (!roleKey || !emailsArg) {
    console.error("Usage: tsx scripts/assign-users-to-role.ts --role-key=<key> --emails=user1@example.com,user2@example.com");
    process.exit(1);
  }
  const emails = emailsArg.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

  const role = await prisma.roleDefinition.findUnique({ where: { key: roleKey } });
  if (!role) {
    console.error(`RoleDefinition not found for key: ${roleKey}`);
    process.exit(1);
  }

  for (const email of emails) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.warn(`⚠️  User not found: ${email}`);
      continue;
    }
    await prisma.user.update({ where: { id: user.id }, data: { roleDefinitionId: role.id } });
    console.log(`✅ Assigned ${email} to role ${roleKey}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

