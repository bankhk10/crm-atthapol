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
  const { 
    creditLimit,
    temporaryCreditLimit,
    temporaryCreditExpiry,
    promotionBudgetLimit
  } = body;

  // Validate inputs
  if (creditLimit !== null && (typeof creditLimit !== "number" || creditLimit < 0)) {
    return NextResponse.json(
      { error: "วงเงินเครดิตต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0" },
      { status: 400 }
    );
  }

  if (temporaryCreditLimit !== null && (typeof temporaryCreditLimit !== "number" || temporaryCreditLimit < 0)) {
    return NextResponse.json(
      { error: "วงเงินเครดิตชั่วคราวต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0" },
      { status: 400 }
    );
  }

  if (temporaryCreditExpiry !== null && !(temporaryCreditExpiry instanceof Date)) {
    return NextResponse.json(
      { error: "วันหมดอายุต้องเป็นวันที่ที่ถูกต้อง" },
      { status: 400 }
    );
  }

  if (promotionBudgetLimit !== null && (typeof promotionBudgetLimit !== "number" || promotionBudgetLimit < 0)) {
    return NextResponse.json(
      { error: "วงเงินส่งเสริมการขายต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0" },
      { status: 400 }
    );
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