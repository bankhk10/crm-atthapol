"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { runWithRequestContext } from "@/lib/request-context";

export async function deleteCustomer(customerId: string) {
  const session = await getServerSession(authOptions);
  const perms = session?.user?.permissions ?? [];
  if (!hasPermission(perms, "customers", "delete")) {
    throw new Error("คุณไม่มีสิทธิ์ลบลูกค้า");
  }

  await runWithRequestContext({ userId: session?.user?.id }, async () => {
    // ใช้ transaction เพื่อความปลอดภัย
    await prisma.$transaction(async (tx) => {
      // --- START: เพิ่มการตรวจสอบร้านรอง ---
      // 1. ค้นหาลูกค้าและประเภท
      const customer = await (tx as any).customer.findUnique({
        where: { id: customerId },
        select: {
          customerType: true,
          dealerDetail: { select: { id: true } }, // เลือก dealerDetail ID
        },
      });

      if (!customer) {
        throw new Error("ไม่พบลูกค้าที่ต้องการลบ");
      }

      // 2. ถ้าเป็น DEALER ให้ตรวจสอบร้านรอง
      if (customer.customerType === "DEALER" && customer.dealerDetail?.id) {
        const dealerDetailId = customer.dealerDetail.id;

        // 3. นับจำนวนร้านรองที่ยัง Active
        const branchCount = await (tx as any).dealerDetail.count({
          where: {
            parentDealerId: dealerDetailId,
            customer: {
              deletedAt: null, // ตรวจสอบว่าร้านรองยังไม่ถูกลบ
            },
          },
        });

        // 4. ถ้ามีร้านรอง, ให้โยน Error
        if (branchCount > 0) {
          throw new Error(
            `ไม่สามารถลบร้านหลักนี้ได้ เนื่องจากมีร้านรองในสังกัด ${branchCount} แห่ง`,
          );
        }
      }
      // --- END: เพิ่มการตรวจสอบร้านรอง ---

      // 5. ถ้าผ่านการตรวจสอบ (ไม่ใช่ Dealer หรือเป็น Dealer ที่ไม่มีร้านรอง)
      // ให้ทำการ Soft Delete ตามปกติ
      const now = new Date();

      await (tx as any).customer.update({
        where: { id: customerId },
        data: { deletedAt: now },
      });

      // Soft delete detail records (จำเป็นสำหรับการ soft delete)
      if (customer.customerType === "DEALER") {
        await (tx as any).dealerDetail.updateMany({
          where: { customerId: customerId },
          data: { deletedAt: now },
        });
      } else if (customer.customerType === "SUB_DEALER") {
        await (tx as any).subDealerDetail.updateMany({
          where: { customerId: customerId },
          data: { deletedAt: now },
        });
      } else if (customer.customerType === "FARMER") {
        await (tx as any).farmerDetail.updateMany({
          where: { customerId: customerId },
          data: { deletedAt: now },
        });
      } else if (customer.customerType === "BROKER") {
        await (tx as any).brokerDetail.updateMany({
          where: { customerId: customerId },
          data: { deletedAt: now },
        });
      }
    });
  });

  revalidatePath("/dashboard/customers");
}