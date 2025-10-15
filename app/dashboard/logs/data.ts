import type { Prisma, AuditAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AuditLogFilters = {
  q?: string;
  model?: string;
  action?: string;
  userId?: string;
  startDate?: string; // yyyy-mm-dd
  endDate?: string; // yyyy-mm-dd
  limit?: number;
};

const buildWhere = (filters: AuditLogFilters = {}) => {
  const where: Prisma.AuditLogWhereInput = { deletedAt: null };

  if (filters.model) where.model = filters.model;
  if (filters.action) where.action = filters.action as AuditAction;
  if (filters.userId) where.performedByUserId = filters.userId;

  if (filters.startDate || filters.endDate) {
    const when: { gte?: Date; lte?: Date } = {};
    if (filters.startDate) when.gte = new Date(filters.startDate);
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      when.lte = end;
    }
    where.performedAt = when;
  }

  if (filters.q) {
    const q = filters.q.trim();
    where.OR = [
      { model: { contains: q } },
      { recordId: { contains: q } },
      { performedBy: { is: { name: { contains: q } } } },
      { performedBy: { is: { email: { contains: q } } } },
    ];
  }

  return where;
};

export function getAuditLogs(filters: AuditLogFilters = {}) {
  const where = buildWhere(filters);
  const take = Number.isFinite(filters.limit as number) ? (filters.limit as number) : 200;
  return prisma.auditLog.findMany({
    where,
    include: { performedBy: { select: { id: true, name: true, email: true } } },
    orderBy: { performedAt: "desc" },
    take,
  });
}

export async function getAuditLogsPage(filters: AuditLogFilters = {}, page = 1, pageSize = 20) {
  const where = buildWhere(filters);
  const skip = Math.max(0, (page - 1) * pageSize);
  const take = Math.max(1, pageSize);

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { performedBy: { select: { id: true, name: true, email: true } } },
      orderBy: { performedAt: "desc" },
      skip,
      take,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { rows, total };
}

export function getAuditLogById(id: string) {
  return prisma.auditLog.findUnique({
    where: { id, deletedAt: null },
    include: {
      performedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}
