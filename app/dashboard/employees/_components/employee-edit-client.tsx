"use client";

import { useRouter } from "next/navigation";
import { Stack } from "@mui/material";

import { EmployeeForm } from "./employee-form";
import { updateEmployee } from "../actions";
import type {
  EmployeeFormValues,
  EmployeeRoleOption,
  RoleDefinitionOption,
} from "../types";

type EmployeeEditClientProps = {
  employeeId: string;
  employeeCode: string;
  initialValues: EmployeeFormValues;
  roleOptions: EmployeeRoleOption[];
  roleDefinitions: RoleDefinitionOption[];
};

export function EmployeeEditClient({
  employeeId,
  employeeCode,
  initialValues,
  roleOptions,
  roleDefinitions,
}: EmployeeEditClientProps) {
  const router = useRouter();

  return (
    <Stack spacing={3}>
      <EmployeeForm
        title={`แก้ไขข้อมูลพนักงาน (${employeeCode})`}
        description=""
        initialValues={initialValues}
        submitLabel="บันทึกการแก้ไข"
        roleOptions={roleOptions}
        roleDefinitions={roleDefinitions}
        onSubmit={async (values) => {
          await updateEmployee(employeeId, values);
          router.push("/dashboard/employees");
          router.refresh();
        }}
      />
    </Stack>
  );
}
