"use client";

import { useRouter } from "next/navigation";
import { Stack } from "@mui/material";

import { EmployeeForm } from "./employee-form";
import { updateEmployee } from "../actions";
import type { EmployeeFormValues } from "../types";

type EmployeeEditClientProps = {
  employeeId: string;
  employeeCode: string;
  initialValues: EmployeeFormValues;
};

export function EmployeeEditClient({
  employeeId,
  employeeCode,
  initialValues,
}: EmployeeEditClientProps) {
  const router = useRouter();

  return (
    <Stack spacing={3}>
      <EmployeeForm
        title={`แก้ไขข้อมูลพนักงาน (${employeeCode})`}
        description="ปรับปรุงข้อมูลพนักงาน รวมถึงอีเมลและสถานะการทำงาน"
        initialValues={initialValues}
        submitLabel="บันทึกการแก้ไข"
        onSubmit={async (values) => {
          await updateEmployee(employeeId, values);
          router.push("/dashboard/employees");
          router.refresh();
        }}
      />
    </Stack>
  );
}
