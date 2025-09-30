import { notFound } from "next/navigation";

import { EmployeeEditClient } from "../../_components/employee-edit-client";
import { ActionButtons } from "../../../_components/action-buttons";
import {
  employeeRoleOptions,
  getEmployeeById,
  getRoleDefinitionOptions,
} from "../../data";
import type { EmployeeFormValues } from "../../types";

export default async function EmployeeEditPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;

  const [employee, roleDefinitions] = await Promise.all([
    getEmployeeById(employeeId),
    getRoleDefinitionOptions(),
  ]);

  if (!employee || !employee.user) {
    notFound();
  }

  const initialValues: EmployeeFormValues = {
    employeeCode: employee.employeeCode ?? "",
     // prefer explicit firstName/lastName if available; otherwise fall back to splitting full name
     firstName: (employee.user as any).firstName ?? (employee.user.name ? employee.user.name.split(" ").slice(0, -1).join(" ") || employee.user.name : undefined),
     lastName: (employee.user as any).lastName ?? (employee.user.name ? employee.user.name.split(" ").slice(-1).join(" ") : undefined),
     name: employee.user.name ?? undefined,
    email: employee.user.email ?? "",
    password: "",
    position: employee.position,
    department: employee.department,
  // cast to any because Prisma Client may not have been regenerated yet on this machine
  company: (employee as any).company ?? undefined,
  responsibilityArea: (employee as any).responsibilityArea ?? undefined,
  birthDate: (employee as any).birthDate ? (employee as any).birthDate.toISOString().slice(0, 10) : undefined,
  age: (employee as any).birthDate ? Math.floor((Date.now() - new Date((employee as any).birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : null,
  gender: (employee as any).gender ?? null,
    phone: employee.phone,
    startDate: employee.startDate.toISOString().slice(0, 10),
    status: employee.status,
    role: (employee.user.role ?? "USER") as EmployeeFormValues["role"],
    roleDefinitionId: employee.user.roleDefinitionId ?? null,
  };

  return (
    <>
      <ActionButtons resource="employees" />
      <EmployeeEditClient
        employeeId={employee.id}
        employeeCode={employee.employeeCode}
        initialValues={initialValues}
        roleOptions={employeeRoleOptions}
        roleDefinitions={roleDefinitions}
      />
    </>
  );
}
