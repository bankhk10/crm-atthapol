import { requirePermission } from "@/lib/require-permission";

import { EmployeesGrid } from "./_components/employees-grid";
import { getEmployees } from "./data";

import type { EmployeeListItem } from "./types";

export default async function EmployeesPage() {
  await requirePermission("employees", "view");
  const employees = await getEmployees();

  const items: EmployeeListItem[] = employees.map((employee) => ({
    id: employee.id,
    employeeCode: employee.employeeCode,
    name:
      employee.firstName || employee.lastName
        ? [employee.firstName, employee.lastName].filter(Boolean).join(" ")
        : (employee.user?.name ?? "-"),
    email: employee.user?.email ?? "-",
    position: employee.position,
    department: employee.department,
    status: employee.status,
    startDate: employee.startDate.toISOString(),
  }));

  return (
    <>
      {/* <ActionButtons resource="employees" /> */}
      <EmployeesGrid employees={items} />
    </>
  );
}
