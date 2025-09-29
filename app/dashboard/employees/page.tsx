import { EmployeesTable } from "./_components/employees-table";
import { getEmployees } from "./data";
import type { EmployeeListItem } from "./types";

export default async function EmployeesPage() {
  const employees = await getEmployees();

  const items: EmployeeListItem[] = employees.map((employee) => ({
    id: employee.id,
    employeeCode: employee.employeeCode,
    name: employee.user?.name ?? "-",
    email: employee.user?.email ?? "-",
    position: employee.position,
    department: employee.department,
    status: employee.status,
    startDate: employee.startDate.toISOString(),
  }));

  return <EmployeesTable employees={items} />;
}
