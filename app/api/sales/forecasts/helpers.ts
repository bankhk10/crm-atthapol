import { z } from "zod";

import { prisma } from "@/lib/prisma";
import type { VisibilityScope } from "@/lib/sales-visibility";

export const ForecastStatusSchema = z.enum(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"]);

export const ForecastLineSchema = z.object({
  customerId: z.string().optional(),
  productId: z.string().optional(),
  channel: z.string().optional(),
  expectedQuantity: z.number().min(0).optional().default(0),
  expectedRevenue: z.number().min(0).optional().default(0),
  confidence: z.number().int().min(0).max(100).optional(),
  note: z.string().optional(),
});

export type ForecastLineInput = z.infer<typeof ForecastLineSchema>;

export const ForecastMonthSchema = z.object({
  month: z.number().int().min(1).max(12),
  targetRevenue: z.number().min(0).optional().default(0),
  targetQuantity: z.number().min(0).optional().default(0),
  note: z.string().optional(),
  lines: z.array(ForecastLineSchema).optional().default([]),
});

export const ForecastPayloadSchema = z
  .object({
    name: z.string().min(1).max(190),
    year: z.number().int().min(2000).max(2100),
    currency: z.string().min(1).max(12).optional(),
    salespersonId: z.string().optional(),
    notes: z.string().optional(),
    status: ForecastStatusSchema.optional(),
    rejectedReason: z.string().optional(),
    months: z.array(ForecastMonthSchema).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.months) {
      const seen = new Set<number>();
      for (const month of value.months) {
        if (seen.has(month.month)) {
          ctx.addIssue({
            code: "custom",
            path: ["months"],
            message: `เดือน ${month.month} ถูกระบุซ้ำ`,
          });
          break;
        }
        seen.add(month.month);
      }
    }
  });

export type ForecastPayload = z.infer<typeof ForecastPayloadSchema>;

export type NormalizedMonth = {
  month: number;
  targetRevenue: number;
  targetQuantity: number;
  note?: string;
  lines: ForecastLineInput[];
};

export function normalizeMonths(payload: ForecastPayload): NormalizedMonth[] {
  const months = new Map<number, NormalizedMonth>();
  for (let m = 1; m <= 12; m++) {
    months.set(m, {
      month: m,
      targetRevenue: 0,
      targetQuantity: 0,
      lines: [],
    });
  }

  for (const item of payload.months ?? []) {
    months.set(item.month, {
      month: item.month,
      targetRevenue: item.targetRevenue ?? 0,
      targetQuantity: item.targetQuantity ?? 0,
      note: item.note,
      lines: (item.lines ?? []).map((line) => ({
        ...line,
        expectedQuantity: line.expectedQuantity ?? 0,
        expectedRevenue: line.expectedRevenue ?? 0,
      })),
    });
  }

  return Array.from(months.values()).sort((a, b) => a.month - b.month);
}

export function aggregateTotals(months: NormalizedMonth[]) {
  return months.reduce(
    (acc, month) => {
      acc.totalRevenueTarget += month.targetRevenue ?? 0;
      acc.totalQuantityTarget += month.targetQuantity ?? 0;
      acc.lineRevenue += month.lines.reduce((sum, line) => sum + (line.expectedRevenue ?? 0), 0);
      acc.lineQuantity += month.lines.reduce((sum, line) => sum + (line.expectedQuantity ?? 0), 0);
      return acc;
    },
    { totalRevenueTarget: 0, totalQuantityTarget: 0, lineRevenue: 0, lineQuantity: 0 },
  );
}

export async function resolveCurrentEmployeeId(userId: string | undefined | null) {
  if (!userId) return null;
  const employee = await prisma.employee.findUnique({ where: { userId }, select: { id: true } });
  return employee?.id ?? null;
}

export function buildVisibilityWhere(
  scope: VisibilityScope,
  options: { department?: string | null; employeeId?: string | null },
) {
  if (scope === "ALL") return {};
  if (scope === "DEPARTMENT") {
    if (!options.department) {
      return { id: { equals: "__NO_MATCH__" } };
    }
    return { salesperson: { department: options.department } };
  }
  if (!options.employeeId) {
    return { id: { equals: "__NO_MATCH__" } };
  }
  return { salespersonId: options.employeeId };
}
