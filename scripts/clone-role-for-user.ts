#!/usr/bin/env tsx
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL },
  },
});

function parseFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

type PermKey = { category: string; name: string };

function toPermKey(s: string): PermKey | null {
  const idx = s.indexOf(":");
  if (idx <= 0) return null;
  const category = s.slice(0, idx).trim();
  const name = s.slice(idx + 1).trim();
  if (!category || !name) return null;
  return { category, name };
}

function slugifyEmail(email: string): string {
  return email
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function main() {
  const baseKey = parseArg("base-role-key");
  const email = parseArg("email");
  const newKeyInput = parseArg("role-key");
  const newNameInput = parseArg("role-name");
  const deptInput = parseArg("department");
  const addPermsArg = parseArg("add-perms");
  const removePermsArg = parseArg("remove-perms");
  const dryRun = parseFlag("dry-run");

  if (!baseKey || !email) {
    console.error(
      "Usage: tsx scripts/clone-role-for-user.ts --base-role-key=<key> --email=<user@example.com> [--role-key=<newKey>] [--role-name=<name>] [--department=<dep>] [--add-perms=cat:name,...] [--remove-perms=cat:name,...] [--dry-run]",
    );
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }

  const base = await prisma.roleDefinition.findUnique({
    where: { key: baseKey },
    include: {
      permissions: {
        include: { permission: true },
      },
    },
  });
  if (!base) {
    console.error(`Base role not found: ${baseKey}`);
    process.exit(1);
  }

  const emailSlug = slugifyEmail(email);
  const defaultKey = `${base.key}_for_${emailSlug}_${Date.now().toString(36)}`.toLowerCase();
  const newKey = (newKeyInput || defaultKey).toLowerCase();
  const newName = newNameInput || `${base.name} (${email})`;
  const department = deptInput ?? (base as any).department ?? null;

  // Build initial permission set from base
  const permSet = new Set<string>();
  for (const rp of base.permissions) {
    const c = rp.permission.category?.trim();
    const n = rp.permission.name?.trim();
    if (c && n) permSet.add(`${c}:${n}`);
  }

  // Apply removes
  if (removePermsArg) {
    for (const raw of removePermsArg.split(",")) {
      const key = raw.trim();
      if (key) permSet.delete(key);
    }
  }

  // Ensure added permissions exist and include them
  const toEnsure: PermKey[] = [];
  if (addPermsArg) {
    for (const raw of addPermsArg.split(",")) {
      const parsed = toPermKey(raw.trim());
      if (parsed) toEnsure.push(parsed);
    }
  }

  // Upsert additional permissions
  for (const p of toEnsure) {
    const perm = await prisma.permission.upsert({
      where: { category_name: { category: p.category, name: p.name } },
      update: {},
      create: { category: p.category, name: p.name },
    });
    permSet.add(`${perm.category}:${perm.name}`);
  }

  const permPairs = Array.from(permSet).map((k) => {
    const [category, name] = k.split(":");
    return { category, name } as PermKey;
  });

  if (dryRun) {
    console.log("[DRY-RUN] Would create role:", { key: newKey, name: newName, department });
    console.log("[DRY-RUN] Permissions:", Array.from(permSet));
    console.log("[DRY-RUN] Would assign to user:", email);
    process.exit(0);
  }

  const created = await prisma.roleDefinition.create({
    data: { key: newKey, name: newName, description: base.description, department },
  });

  // Resolve permission IDs
  const perms = await prisma.permission.findMany({
    where: {
      OR: permPairs.map((p) => ({ category: p.category, name: p.name })),
    },
    select: { id: true },
  });

  if (perms.length) {
    await prisma.rolePermission.createMany({
      data: perms.map((p) => ({ roleId: created.id, permissionId: p.id })),
      skipDuplicates: true,
    });
  }

  await prisma.user.update({ where: { id: user.id }, data: { roleDefinitionId: created.id } });

  console.log(`✅ Cloned role ${baseKey} -> ${newKey} and assigned to ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
