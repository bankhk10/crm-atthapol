import { prisma } from "../lib/prisma";
import bcrypt from "bcrypt";

async function main() {
  const email = "admin@example.com";
  const pwd = await bcrypt.hash("Admin@123", 10);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Admin", passwordHash: pwd, role: "ADMIN" },
  });

  console.log("✅ Seeded admin: admin@example.com / Admin@123");
}

main().catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
