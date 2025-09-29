"use server";

import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

import type { EmployeeFormValues } from "./types";

const employeeFormSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อพนักงาน"),
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  password: z.string().optional(),
  position: z.string().min(1, "กรุณากรอกตำแหน่ง"),
  department: z.string().min(1, "กรุณาเลือกแผนก"),
  phone: z.string().min(1, "กรุณากรอกเบอร์โทร"),
  startDate: z.string().min(1, "กรุณาเลือกวันที่เริ่มงาน"),
  status: z.enum(["ACTIVE", "ON_LEAVE", "INACTIVE"], { message: "สถานะไม่ถูกต้อง" }),
  role: z.enum(["ADMIN", "MANAGER", "USER"], { message: "บทบาทไม่ถูกต้อง" }),
  roleDefinitionId: z
    .string()
    .trim()
    .nullish()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

async function generateEmployeeCode(tx: Prisma.TransactionClient) {
  const lastEmployee = await tx.employee.findFirst({
    orderBy: { createdAt: "desc" },
    select: { employeeCode: true },
  });

  const lastNumber = lastEmployee
    ? Number.parseInt(lastEmployee.employeeCode.replace(/\D/g, ""), 10)
    : 0;

  const nextNumber = Number.isFinite(lastNumber) ? lastNumber + 1 : 1;
  return `EMP-${nextNumber.toString().padStart(4, "0")}`;
}

export async function createEmployee(rawValues: EmployeeFormValues) {
  const values = employeeFormSchema.parse(rawValues);

  if (!values.password || values.password.length < 6) {
    throw new Error("กรุณากรอกรหัสผ่านอย่างน้อย 6 ตัวอักษร");
  }

  const passwordHash = await bcrypt.hash(values.password, 10);

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: values.name,
          email: values.email,
          passwordHash,
          role: values.role,
          roleDefinitionId: values.roleDefinitionId,
        },
      });

      const employeeCode = await generateEmployeeCode(tx);

      await tx.employee.create({
        data: {
          userId: user.id,
          employeeCode,
          position: values.position,
          department: values.department,
          phone: values.phone,
          startDate: new Date(values.startDate),
          status: values.status,
        },
      });
    });
  } catch (error) {
    handlePrismaError(error);
  }

  revalidatePath("/dashboard/employees");
}

export async function updateEmployee(
  employeeId: string,
  rawValues: EmployeeFormValues,
) {
  const values = employeeFormSchema.parse(rawValues);

  try {
    await prisma.$transaction(async (tx) => {
      const employee = await tx.employee.findUnique({
        where: { id: employeeId },
        include: { user: true },
      });

      if (!employee) {
        throw new Error("ไม่พบข้อมูลพนักงานที่ต้องการแก้ไข");
      }

      await tx.user.update({
        where: { id: employee.userId },
        data: {
          name: values.name,
          email: values.email,
          role: values.role,
          roleDefinitionId: values.roleDefinitionId,
          ...(values.password
            ? { passwordHash: await bcrypt.hash(values.password, 10) }
            : {}),
        },
      });

      await tx.employee.update({
        where: { id: employeeId },
        data: {
          position: values.position,
          department: values.department,
          phone: values.phone,
          startDate: new Date(values.startDate),
          status: values.status,
        },
      });
    });
  } catch (error) {
    handlePrismaError(error);
  }

  revalidatePath("/dashboard/employees");
  revalidatePath(`/dashboard/employees/${employeeId}/edit`);
}

function handlePrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = error.meta?.target as string | string[] | undefined;
      const targets = Array.isArray(target)
        ? target
        : typeof target === "string"
          ? [target]
          : [];

      if (targets.includes("email")) {
        throw new Error("อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น");
      }

      if (targets.includes("employeeCode")) {
        throw new Error("รหัสพนักงานนี้ถูกใช้งานแล้ว กรุณาใช้รหัสอื่น");
      }

      if (targets.includes("userId")) {
        throw new Error("บัญชีผู้ใช้นี้ถูกผูกกับพนักงานคนอื่นแล้ว");
      }

      throw new Error("ข้อมูลซ้ำ กรุณาตรวจสอบแล้วลองอีกครั้ง");
    }
  }

  if (error instanceof Error) {
    throw error;
  }

  throw new Error("ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
}
