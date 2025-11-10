import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { customerId: string } }
) {
  await requirePermission("customers", "create");

  const { customerId } = params;
  const body = await request.json();
  const { amount, expiryDate } = body;

  if (typeof amount !== "number" || amount < 0) {
    return NextResponse.json(
      { error: "จำนวนเงินต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0" },
      { status: 400 }
    );
  }

  if (!expiryDate || isNaN(new Date(expiryDate).getTime())) {
    return NextResponse.json(
      { error: "วันที่หมดอายุไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  try {
    // Create request first
    const request = await prisma.tempCreditRequest.create({
      data: {
        customerId,
        amount,
        expiryDate: new Date(expiryDate),
        status: "PENDING",
      },
    });

    return NextResponse.json(request);
  } catch (error) {
    console.error("Error creating temp credit request:", error);
    return NextResponse.json(
      { error: "บันทึกคำขอไม่สำเร็จ" },
      { status: 500 }
    );
  }
}