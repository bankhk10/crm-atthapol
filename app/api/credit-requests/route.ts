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
    if (canApprove) {
      // approver: return all (optionally filtered)
      const where: any = {};
      if (statusFilter) where.status = statusFilter.toUpperCase();
      const list = await prisma.tempCreditRequest.findMany({ where, orderBy: { createdAt: "desc" } });
      return NextResponse.json(list);
    }

    // non-approver: return own requests
    const list = await prisma.tempCreditRequest.findMany({ where: { requestedByUserId: userId }, orderBy: { createdAt: "desc" } });
    return NextResponse.json(list);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  }
}
