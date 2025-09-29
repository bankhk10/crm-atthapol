import { notFound } from "next/navigation";

import { EmployeeEditClient } from "../../_components/employee-edit-client";
import { getEmployeeById } from "../../data";

export default async function EmployeeEditPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;

  const employee = await getEmployeeById(employeeId);

  if (!employee || !employee.user) {
    notFound();
  }

  return (
    <EmployeeEditClient
      employeeId={employee.id}
      employeeCode={employee.employeeCode}
      initialValues={{
        name: employee.user.name ?? "",
        email: employee.user.email ?? "",
        password: "",
        position: employee.position,
        department: employee.department,
        phone: employee.phone,
        startDate: employee.startDate.toISOString().slice(0, 10),
        status: employee.status,
      }}
    />
  );
}