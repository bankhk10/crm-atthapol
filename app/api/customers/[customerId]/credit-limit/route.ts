import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  await requirePermission("customers", "edit");

  const { customerId } = await params;
  const body = await request.json();
  let { 
    creditLimit,
    temporaryCreditLimit,
    temporaryCreditExpiry,
    promotionBudgetLimit
  } = body;

  // Validate inputs
  if (creditLimit !== null && creditLimit !== undefined) {
    creditLimit = parseFloat(creditLimit);
    if (isNaN(creditLimit) || creditLimit < 0) {
      return NextResponse.json(
        { error: "วงเงินเครดิตต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0" },
        { status: 400 }
      );
    }
  } else {
    creditLimit = null;
  }

  if (temporaryCreditLimit !== null && temporaryCreditLimit !== undefined) {
    temporaryCreditLimit = parseFloat(temporaryCreditLimit);
    if (isNaN(temporaryCreditLimit) || temporaryCreditLimit < 0) {
      return NextResponse.json(
        { error: "วงเงินเครดิตชั่วคราวต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0" },
        { status: 400 }
      );
    }
  } else {
    temporaryCreditLimit = null;
  }

  // Parse temporaryCreditExpiry: accept null, undefined, or ISO string
  if (temporaryCreditExpiry !== null && temporaryCreditExpiry !== undefined) {
    const parsed = new Date(temporaryCreditExpiry);
    if (isNaN(parsed.getTime())) {
      return NextResponse.json(
        { error: "วันหมดอายุต้องเป็นวันที่ที่ถูกต้อง" },
        { status: 400 }
      );
    }
    temporaryCreditExpiry = parsed;
  } else {
    temporaryCreditExpiry = null;
  }

  if (promotionBudgetLimit !== null && promotionBudgetLimit !== undefined) {
    promotionBudgetLimit = parseFloat(promotionBudgetLimit);
    if (isNaN(promotionBudgetLimit) || promotionBudgetLimit < 0) {
      return NextResponse.json(
        { error: "วงเงินส่งเสริมการขายต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0" },
        { status: 400 }
      );
    }
  } else {
    promotionBudgetLimit = null;
  }

  try {
    const updatedDealerDetail = await prisma.dealerDetail.update({
      where: {
        customerId: customerId,
      },
      data: {
        creditLimit,
        temporaryCreditLimit,
        temporaryCreditExpiry,
        promotionBudgetLimit,
      },
    });

    return NextResponse.json(updatedDealerDetail);
  } catch (error) {
    console.error("Error updating credit limit:", error);
    return NextResponse.json(
      { error: "Failed to update credit limit" },
      { status: 500 }
    );
  }
}