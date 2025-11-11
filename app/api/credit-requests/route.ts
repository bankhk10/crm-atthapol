import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  await requirePermission("customers", "edit");

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;

  const body = await request.json();
  const { customerId, amount, expiryDate, reason } = body;

  if (!customerId) return NextResponse.json({ error: "customerId is required" }, { status: 400 });
  if (typeof amount !== "number" || amount <= 0) {
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }

  try {
    const rec = await prisma.tempCreditRequest.create({
      data: {
        customerId,
        amount,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        reason: reason || null,
        requestedByUserId: userId,
        status: "PENDING",
      },
    });

    return NextResponse.json(rec);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // require approve permission to list all pending requests, otherwise list user's own
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;
  const q = new URL(request.url).searchParams;
  const statusFilter = q.get("status");

  const canApprove = await (async () => {
    try {
      await requirePermission("customers", "approve");
      return true;
    } catch (_) {
      return false;
    }
  })();

  try {
    // parse pagination/search
    const page = Number(q.get("page") || "1");
    const pageSize = Number(q.get("pageSize") || "0");
    const search = (q.get("q") || "").trim();

    const buildWhere = () => {
      const where: any = {};
      if (statusFilter) where.status = statusFilter.toUpperCase();
      if (canApprove) {
        // approver: optionally filter by search across customer name/company
        if (search) {
          where.OR = [
            { customer: { name: { contains: search, mode: "insensitive" } } },
            { customer: { companyName: { contains: search, mode: "insensitive" } } },
          ];
        }
      } else {
        // non-approver: only own
        where.requestedByUserId = userId;
        if (search) {
          where.OR = [
            { customer: { name: { contains: search, mode: "insensitive" } } },
            { customer: { companyName: { contains: search, mode: "insensitive" } } },
          ];
        }
      }
      return where;
    };

    const where = buildWhere();

    // count for pagination
    const total = await prisma.tempCreditRequest.count({ where });

    const findOpts: any = {
      where,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { include: { dealerDetail: true } },
        requestedBy: { select: { id: true, name: true, email: true } },
        processedBy: { select: { id: true, name: true, email: true } },
      },
    };

    if (pageSize && page > 0) {
      findOpts.skip = (page - 1) * pageSize;
      findOpts.take = pageSize;
    }

    const list = await prisma.tempCreditRequest.findMany(findOpts);
    return NextResponse.json({ items: list, total });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  }
}
