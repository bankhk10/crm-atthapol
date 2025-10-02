import { notFound } from "next/navigation";

import { EmployeeEditClient } from "../../_components/employee-edit-client";
import { ActionButtons } from "../../../_components/action-buttons";
import { Box, Stack } from "@mui/material";
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
    prefix: employee.prefix ?? "",
    firstName: employee.firstName ?? "",
    lastName: employee.lastName ?? "",
    name: employee.user.name ?? undefined,
    email: employee.user.email ?? "",
    password: "",
    position: employee.position,
    department: employee.department,
    company: employee.company ?? undefined,
    responsibilityArea: employee.responsibilityArea ?? undefined,
    address: employee.address ?? undefined,
    province: employee.province ?? undefined,
    district: employee.district ?? undefined,
    subdistrict: employee.subdistrict ?? undefined,
    postalCode: employee.postalCode ?? undefined,
    birthDate: employee.birthDate ? employee.birthDate.toISOString().slice(0, 10) : undefined,
    age: employee.birthDate
      ? Math.floor((Date.now() - new Date(employee.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
      : null,
    gender: employee.gender ?? null,
    phone: employee.phone,
    startDate: employee.startDate.toISOString().slice(0, 10),
    status: employee.status,
    role: (employee.user.role ?? "USER") as EmployeeFormValues["role"],
    roleDefinitionId: employee.user.roleDefinitionId ?? null,
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 4,
      }}
    >
      <Stack spacing={3} sx={{ width: "100%", maxWidth: 960 }}>
        <ActionButtons resource="employees" />
        <EmployeeEditClient
          employeeId={employee.id}
          employeeCode={employee.employeeCode}
          initialValues={initialValues}
          roleOptions={employeeRoleOptions}
          roleDefinitions={roleDefinitions}
        />
      </Stack>
    </Box>
  );
}
