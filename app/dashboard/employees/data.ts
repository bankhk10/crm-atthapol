import { prisma } from "@/lib/prisma";

export function getEmployees() {
  return prisma.employee.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
}

export function getEmployeeById(id: string) {
  return prisma.employee.findUnique({
    where: { id },
    include: { user: true },
  });
}
