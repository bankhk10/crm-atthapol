"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Stack, Typography } from "@mui/material";

import { EmployeeForm } from "../../_components/employee-form";
import { getEmployeeById } from "../../data";

export default function EmployeeEditPage({
  params,
}: {
  params: { employeeId: string };
}) {
  const router = useRouter();
  const employee = getEmployeeById(params.employeeId);

  if (!employee) {
    return (
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={700}>
          ไม่พบข้อมูลพนักงาน
        </Typography>
        <Typography color="text.secondary">
          ไม่พบรหัสพนักงานที่ต้องการแก้ไข กรุณากลับไปยังหน้ารายการพนักงาน
        </Typography>
        <Button component={Link} href="/dashboard/employees" variant="contained" sx={{ width: "fit-content" }}>
          กลับไปหน้าพนักงาน
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <EmployeeForm
        title={`แก้ไขข้อมูลพนักงาน (${employee.employeeCode})`}
        description="ปรับปรุงข้อมูลพนักงาน รวมถึงอีเมลและสถานะการทำงาน"
        initialValues={{
          name: employee.name,
          email: employee.email,
          password: "",
          position: employee.position,
          department: employee.department,
          phone: employee.phone,
          startDate: employee.startDate,
          status: employee.status,
        }}
        submitLabel="บันทึกการแก้ไข"
        onSubmit={async (values) => {
          console.log("update employee", employee.id, values);
          router.push("/dashboard/employees");
        }}
      />
      <Typography color="text.secondary">
        * ตัวอย่างการแก้ไขข้อมูลนี้เป็นการจำลอง ยังไม่มีการเชื่อมต่อฐานข้อมูลจริง
      </Typography>
    </Stack>
  );
}
