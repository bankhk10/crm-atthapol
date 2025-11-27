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
} from "./helpers";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const perms = session?.user?.permissions;
    if (!hasPermission(perms, "sales", "view")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์ดู Forecast" }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get("year");
    const salespersonIdParam = searchParams.get("salespersonId") ?? undefined;
    const statusParam = searchParams.get("status") ?? undefined;
    const includeMonths = searchParams.get("includeMonths") === "true";
    const includeLines = searchParams.get("includeLines") === "true";
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") || 20)));

    const scope = getVisibilityScope(perms);
    const currentEmployeeId = await resolveCurrentEmployeeId(session?.user?.id);
    const visibilityWhere = buildVisibilityWhere(scope, {
      department: session?.user?.department,
      employeeId: currentEmployeeId,
    });

    const where: Record<string, unknown> = { deletedAt: null };
    if (yearParam) {
      const year = Number(yearParam);
      if (!Number.isFinite(year)) {
        return NextResponse.json({ error: "ระบุปีไม่ถูกต้อง" }, { status: 400 });
      }
      where.year = year;
    }
    if (statusParam) {
      where.status = statusParam;
    }
    if (scope === "ALL" && salespersonIdParam) {
      where.salespersonId = salespersonIdParam;
    }

    const finalWhere = { ...where, ...visibilityWhere };

    const include: any = {
      salesperson: { select: { id: true, firstName: true, lastName: true, department: true } },
    };
    if (includeMonths) {
      include.months = {
        orderBy: { month: "asc" },
        include: includeLines ? { lines: true } : undefined,
      };
    }

    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      prisma.forecast.findMany({
        where: finalWhere,
        orderBy: [{ year: "desc" }, { name: "asc" }],
        skip,
        take: pageSize,
        include,
      }),
      prisma.forecast.count({ where: finalWhere }),
    ]);

    return NextResponse.json({ items, total, page, pageSize });
  } catch (error) {
    console.error("[GET /api/sales/forecasts]", error);
    return NextResponse.json({ error: "ไม่สามารถดึง Forecast ได้" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const perms = session?.user?.permissions;
    if (!hasPermission(perms, "sales", "create")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์สร้าง Forecast" }, { status: 403 });
    }

    const payloadJson = await req.json();
    const parsed = ForecastPayloadSchema.safeParse(payloadJson);
    if (!parsed.success) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง", issues: parsed.error.format() }, { status: 400 });
    }

    const payload = parsed.data;
    const scope = getVisibilityScope(perms);
    const currentEmployeeId = await resolveCurrentEmployeeId(session?.user?.id);

    let salespersonId = payload.salespersonId ?? currentEmployeeId ?? undefined;
    if (!salespersonId) {
      return NextResponse.json({ error: "ไม่พบพนักงานผู้รับผิดชอบ" }, { status: 400 });
    }
    if (scope === "OWN" && salespersonId !== currentEmployeeId) {
      salespersonId = currentEmployeeId ?? salespersonId;
    }

    const employee = await prisma.employee.findUnique({ where: { id: salespersonId } });
    if (!employee) {
      return NextResponse.json({ error: "ไม่พบพนักงานผู้รับผิดชอบ" }, { status: 404 });
    }
    if (scope === "DEPARTMENT" && session?.user?.department && employee.department !== session.user.department) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์สร้าง Forecast ให้บุคคลอื่น" }, { status: 403 });
    }

    const requestedStatus = (payload.status ?? "DRAFT") as "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
    if (requestedStatus === "APPROVED" && !hasPermission(perms, "sales", "approve")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์อนุมัติ Forecast" }, { status: 403 });
    }
    if (requestedStatus === "REJECTED" && !hasPermission(perms, "sales", "reject")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์ปฏิเสธ Forecast" }, { status: 403 });
    }

    const normalizedMonths = normalizeMonths(payload);
    const totals = aggregateTotals(normalizedMonths);

    const forecast = await prisma.forecast.create({
      data: {
        name: payload.name,
        year: payload.year,
        currency: payload.currency ?? "THB",
        salespersonId,
        notes: payload.notes,
        status: requestedStatus,
        rejectedReason: requestedStatus === "REJECTED" ? payload.rejectedReason ?? null : null,
        totalRevenueTarget: totals.totalRevenueTarget || totals.lineRevenue,
        totalQuantityTarget: totals.totalQuantityTarget || totals.lineQuantity,
        submittedAt: requestedStatus !== "DRAFT" ? new Date() : null,
        approvedAt: requestedStatus === "APPROVED" ? new Date() : null,
        approvedByUserId:
          requestedStatus === "APPROVED" && session?.user?.id ? session.user.id : null,
        months: {
          create: normalizedMonths.map((month) => ({
            month: month.month,
            targetRevenue: month.targetRevenue,
            targetQuantity: month.targetQuantity,
            note: month.note,
            lines: { create: month.lines },
          })),
        },
      },
      include: {
        salesperson: { select: { id: true, firstName: true, lastName: true } },
        months: { include: { lines: true } },
      },
    });

    return NextResponse.json(forecast, { status: 201 });
  } catch (error) {
    console.error("[POST /api/sales/forecasts]", error);
    return NextResponse.json({ error: "สร้าง Forecast ไม่สำเร็จ" }, { status: 500 });
  }
}
