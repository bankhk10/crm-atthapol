"use client";

import { useRouter } from "next/navigation";
import { Stack } from "@mui/material";

import { EmployeeForm } from "./employee-form";
import { createEmployee } from "../actions";
import type {
  EmployeeFormValues,
  EmployeeRoleOption,
  RoleDefinitionOption,
} from "../types";

type EmployeeCreateClientProps = {
  roleOptions: EmployeeRoleOption[];
  roleDefinitions: RoleDefinitionOption[];
};

const defaultInitialValues: EmployeeFormValues = {
  prefix: "",
  name: "",
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  employeeCode: "",
  position: "",
  department: "",
  company: "",
  address: "",
  responsibilityArea: undefined,
  birthDate: undefined,
  age: null,
  gender: null,
  phone: "",
  startDate: new Date().toISOString().slice(0, 10),
  status: "ACTIVE",
  role: "USER",
  roleDefinitionId: null,
};

export function EmployeeCreateClient({
  roleOptions,
  roleDefinitions,
}: EmployeeCreateClientProps) {
  const router = useRouter();

  const initialValues: EmployeeFormValues = {
    ...defaultInitialValues,
    // roleDefinitionId: roleDefinitions[0]?.id ?? null,
  };

  return (
    <Stack spacing={3}>
      <EmployeeForm
        title="เพิ่มข้อมูลพนักงานใหม่"
        description=""
        initialValues={initialValues}
        submitLabel="เพิ่มพนักงาน"
        requirePassword
        roleOptions={roleOptions}
        roleDefinitions={roleDefinitions}
        onSubmit={async (values) => {
          await createEmployee(values);
          router.push("/dashboard/employees");
          router.refresh();
        }}
      />
    </Stack>
  );
}
