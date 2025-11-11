import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requirePermission("customers", "approve");
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const processedByUserId = session?.user?.id ?? null;

  const body = await request.json();
  const { action, note } = body; // action: 'approve' | 'reject'

  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  try {
    const req = await prisma.tempCreditRequest.findUnique({ where: { id } });
    if (!req) return NextResponse.json({ error: "not found" }, { status: 404 });

    if (req.status !== 'PENDING') {
      return NextResponse.json({ error: "request already processed" }, { status: 400 });
    }

    if (action === 'approve') {
      // Approve: update TempCreditRequest and update dealerDetail
      await prisma.$transaction(async (tx) => {
  await tx.tempCreditRequest.update({ where: { id }, data: { status: 'APPROVED', processedByUserId, processedAt: new Date(), rejectReason: null } as any });

        await tx.dealerDetail.update({ where: { customerId: req.customerId }, data: { temporaryCreditLimit: req.amount, temporaryCreditExpiry: req.expiryDate } });
      });

      return NextResponse.json({ success: true });
    }

    // reject: save provided note as rejectReason
  await prisma.tempCreditRequest.update({ where: { id }, data: { status: 'REJECTED', processedByUserId, processedAt: new Date(), rejectReason: note || null } as any });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? null;

    // Find the request
    const rec = await prisma.tempCreditRequest.findUnique({ where: { id } });
    if (!rec) return NextResponse.json({ error: "ไม่พบคำขอ" }, { status: 404 });

    // Allow deletion if user is approver (has approve permission) or the original requester
    try {
      await requirePermission("customers", "approve");
      // approver allowed
    } catch (_) {
      // not an approver, only allow owner
      if (rec.requestedByUserId !== userId) {
        return NextResponse.json({ error: "ไม่มีสิทธิ์ลบคำขอ" }, { status: 403 });
      }
    }

    // Only allow deleting pending requests
    if (rec.status !== "PENDING") {
      return NextResponse.json({ error: "ไม่สามารถลบคำขอที่ผ่านการดำเนินการแล้ว" }, { status: 400 });
    }

    await prisma.tempCreditRequest.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "ลบคำขอไม่สำเร็จ" }, { status: 500 });
  }
}
