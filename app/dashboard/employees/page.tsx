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

function StatusChip({ status }: { status: EmployeeStatus }) {
  if (status === "ACTIVE") {
    return <Chip label="ปฏิบัติงาน" color="success" variant="outlined" />;
  }

  if (status === "ON_LEAVE") {
    return <Chip label="ลาพัก" color="warning" variant="outlined" />;
  }

  return <Chip label="ออกจากงาน" color="default" variant="outlined" />;
}
