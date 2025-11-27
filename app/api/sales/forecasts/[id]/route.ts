import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getVisibilityScope } from "@/lib/sales-visibility";
import {
  ForecastPayloadSchema,
  aggregateTotals,
  buildVisibilityWhere,
  normalizeMonths,
  resolveCurrentEmployeeId,
} from "../helpers";

export const runtime = "nodejs";

type ForecastStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

async function assertAccess(forecastId: string, perms: readonly string[] | undefined, session: any) {
  const scope = getVisibilityScope(perms);
  const currentEmployeeId = await resolveCurrentEmployeeId(session?.user?.id);
  const visibilityWhere = buildVisibilityWhere(scope, {
    department: session?.user?.department,
    employeeId: currentEmployeeId,
  });

  const forecast = await prisma.forecast.findFirst({
    where: { id: forecastId, ...visibilityWhere },
    include: {
      salesperson: { select: { id: true, department: true } },
    },
  });
  if (!forecast) return null;
  return { forecast, scope, currentEmployeeId } as const;
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const session = await getServerSession(authOptions);
    const perms = session?.user?.permissions;
    if (!hasPermission(perms, "sales", "view")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์ดู Forecast" }, { status: 403 });
    }

    const scope = getVisibilityScope(perms);
    const currentEmployeeId = await resolveCurrentEmployeeId(session?.user?.id);
    const visibilityWhere = buildVisibilityWhere(scope, {
      department: session?.user?.department,
      employeeId: currentEmployeeId,
    });

    const forecast = await prisma.forecast.findFirst({
      where: { id, ...visibilityWhere },
      include: {
        salesperson: { select: { id: true, firstName: true, lastName: true, department: true } },
        months: { include: { lines: true }, orderBy: { month: "asc" } },
      },
    });

    if (!forecast) {
      return NextResponse.json({ error: "ไม่พบ Forecast" }, { status: 404 });
    }

    return NextResponse.json(forecast);
  } catch (error) {
    console.error(`[GET /api/sales/forecasts/${id}]`, error);
    return NextResponse.json({ error: "ไม่สามารถดึง Forecast ได้" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const session = await getServerSession(authOptions);
    const perms = session?.user?.permissions;
    if (!hasPermission(perms, "sales", "edit")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์แก้ไข Forecast" }, { status: 403 });
    }

    const payloadJson = await req.json();
    const monthsProvided =
      payloadJson && typeof payloadJson === "object" && Array.isArray((payloadJson as any).months);
    const parsed = ForecastPayloadSchema.safeParse(payloadJson);
    if (!parsed.success) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง", issues: parsed.error.format() }, { status: 400 });
    }

    const payload = parsed.data;

    const sessionContext = await assertAccess(id, perms, session);
    if (!sessionContext) {
      return NextResponse.json({ error: "ไม่พบ Forecast" }, { status: 404 });
    }

    const { forecast: existing, scope, currentEmployeeId } = sessionContext;

    let salespersonId = payload.salespersonId ?? existing.salespersonId;
    if (!salespersonId) {
      return NextResponse.json({ error: "ต้องระบุผู้รับผิดชอบ" }, { status: 400 });
    }
    if (scope === "OWN" && salespersonId !== currentEmployeeId) {
      salespersonId = currentEmployeeId ?? salespersonId;
    }

    const employee = await prisma.employee.findUnique({ where: { id: salespersonId } });
    if (!employee) {
      return NextResponse.json({ error: "ไม่พบพนักงานผู้รับผิดชอบ" }, { status: 404 });
    }
    if (
      scope === "DEPARTMENT" &&
      session?.user?.department &&
      employee.department !== session.user.department
    ) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์เปลี่ยน Forecast ไปยังบุคคลอื่น" }, { status: 403 });
    }

    const requestedStatus = (payload.status ?? existing.status) as ForecastStatus;
    if (requestedStatus === "APPROVED" && !hasPermission(perms, "sales", "approve")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์อนุมัติ Forecast" }, { status: 403 });
    }
    if (requestedStatus === "REJECTED" && !hasPermission(perms, "sales", "reject")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์ปฏิเสธ Forecast" }, { status: 403 });
    }

    const normalizedMonths = monthsProvided ? normalizeMonths(payload) : undefined;
    const totals = normalizedMonths ? aggregateTotals(normalizedMonths) : undefined;

    const statusChanged = requestedStatus !== existing.status;
    let submittedAt = existing.submittedAt;
    let approvedAt = existing.approvedAt;
    let approvedByUserId = existing.approvedByUserId;
    let rejectedReason = existing.rejectedReason;

    switch (requestedStatus) {
      case "DRAFT":
        submittedAt = null;
        approvedAt = null;
        approvedByUserId = null;
        rejectedReason = null;
        break;
      case "SUBMITTED":
        submittedAt = statusChanged || !submittedAt ? new Date() : submittedAt;
        approvedAt = null;
        approvedByUserId = null;
        rejectedReason = null;
        break;
      case "APPROVED":
        submittedAt = submittedAt ?? new Date();
        approvedAt = new Date();
        approvedByUserId = session?.user?.id ?? approvedByUserId;
        rejectedReason = null;
        break;
      case "REJECTED":
        submittedAt = submittedAt ?? new Date();
        approvedAt = null;
        approvedByUserId = null;
        rejectedReason = payload.rejectedReason ?? null;
        break;
      default:
        break;
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.forecast.update({
        where: { id },
        data: {
          name: payload.name,
          year: payload.year,
          currency: payload.currency ?? existing.currency,
          salespersonId,
          notes: payload.notes,
          status: requestedStatus,
          rejectedReason: requestedStatus === "REJECTED" ? rejectedReason : null,
          totalRevenueTarget: totals
            ? totals.totalRevenueTarget || totals.lineRevenue
            : existing.totalRevenueTarget,
          totalQuantityTarget: totals
            ? totals.totalQuantityTarget || totals.lineQuantity
            : existing.totalQuantityTarget,
          submittedAt,
          approvedAt,
          approvedByUserId,
        },
      });

      if (normalizedMonths) {
        await tx.forecastMonth.deleteMany({ where: { forecastId: id } });
        for (const month of normalizedMonths) {
          await tx.forecastMonth.create({
            data: {
              forecastId: id,
              month: month.month,
              targetRevenue: month.targetRevenue,
              targetQuantity: month.targetQuantity,
              note: month.note,
              lines: { create: month.lines },
            },
          });
        }
      }

      return tx.forecast.findUnique({
        where: { id },
        include: {
          salesperson: { select: { id: true, firstName: true, lastName: true, department: true } },
          months: { include: { lines: true }, orderBy: { month: "asc" } },
        },
      });
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(`[PUT /api/sales/forecasts/${id}]`, error);
    return NextResponse.json({ error: "อัปเดต Forecast ไม่สำเร็จ" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const session = await getServerSession(authOptions);
    const perms = session?.user?.permissions;
    if (!hasPermission(perms, "sales", "delete")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์ลบ Forecast" }, { status: 403 });
    }

    const scope = getVisibilityScope(perms);
    const currentEmployeeId = await resolveCurrentEmployeeId(session?.user?.id);
    const visibilityWhere = buildVisibilityWhere(scope, {
      department: session?.user?.department,
      employeeId: currentEmployeeId,
    });

    const forecast = await prisma.forecast.findFirst({ where: { id, ...visibilityWhere } });
    if (!forecast) {
      return NextResponse.json({ error: "ไม่พบ Forecast" }, { status: 404 });
    }

    await prisma.forecast.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(`[DELETE /api/sales/forecasts/${id}]`, error);
    return NextResponse.json({ error: "ลบ Forecast ไม่สำเร็จ" }, { status: 500 });
  }
}
