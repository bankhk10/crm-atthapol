import { notFound } from "next/navigation";

import { EmployeeEditClient } from "../../_components/employee-edit-client";
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
    name: employee.user.name ?? "",
    email: employee.user.email ?? "",
    password: "",
    position: employee.position,
    department: employee.department,
    phone: employee.phone,
    startDate: employee.startDate.toISOString().slice(0, 10),
    status: employee.status,
    role: (employee.user.role ?? "USER") as EmployeeFormValues["role"],
    roleDefinitionId: employee.user.roleDefinitionId ?? null,
  };

  return (
    <EmployeeEditClient
      employeeId={employee.id}
      employeeCode={employee.employeeCode}
      initialValues={initialValues}
      roleOptions={employeeRoleOptions}
      roleDefinitions={roleDefinitions}
    />
  );
}
