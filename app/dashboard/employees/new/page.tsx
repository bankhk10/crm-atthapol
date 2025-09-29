"use client";

import { useRouter } from "next/navigation";
import { Stack } from "@mui/material";

import { EmployeeForm } from "../_components/employee-form";
import { createEmployee } from "../actions";

export default function EmployeeCreatePage() {
  const router = useRouter();

  return (
    <Stack spacing={3}>
      <EmployeeForm
        title="เพิ่มข้อมูลพนักงานใหม่"
        description="กรอกข้อมูลรายละเอียดพนักงาน รวมถึงอีเมลและรหัสผ่านสำหรับการเข้าสู่ระบบ"
        initialValues={{
          name: "",
          email: "",
          password: "",
          position: "",
          department: "วิศวกรรม",
          phone: "",
          startDate: new Date().toISOString().slice(0, 10),
          status: "ACTIVE",
        }}
        submitLabel="เพิ่มพนักงาน"
        requirePassword
        onSubmit={async (values) => {
          await createEmployee(values);
          router.push("/dashboard/employees");
          router.refresh();
        }}
      />
    </Stack>
  );
}
