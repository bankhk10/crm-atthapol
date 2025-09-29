"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Alert, Button, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";

import type { EmployeeFormValues } from "../types";

export type EmployeeFormProps = {
  title: string;
  description: string;
  initialValues: EmployeeFormValues;
  submitLabel?: string;
  onSubmit?: (values: EmployeeFormValues) => Promise<void> | void;
  requirePassword?: boolean;
};

const statusOptions = [
  { value: "ACTIVE", label: "ปฏิบัติงาน" },
  { value: "ON_LEAVE", label: "ลาพัก" },
  { value: "INACTIVE", label: "ออกจากงาน" },
];

const departmentOptions = [
  "วิศวกรรม",
  "ประสบการณ์ผู้ใช้",
  "วิเคราะห์ธุรกิจ",
  "การตลาด",
  "ทรัพยากรบุคคล",
  "การเงิน",
  "บริการลูกค้า",
];

export function EmployeeForm({
  title,
  description,
  initialValues,
  submitLabel = "บันทึกข้อมูล",
  onSubmit,
  requirePassword = false,
}: EmployeeFormProps) {
  const [values, setValues] = useState<EmployeeFormValues>(initialValues);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const departmentItems = useMemo(
    () => [...departmentOptions].sort((a, b) => a.localeCompare(b)),
    [],
  );

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const handleChange = <Field extends keyof EmployeeFormValues>(
    field: Field,
  ) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setError(null);
      setValues((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    try {
      setSubmitting(true);
      setError(null);
      await onSubmit?.(values);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitWithErrors = async (event: FormEvent<HTMLFormElement>) => {
    try {
      await handleSubmit(event);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง";
      setError(message);
    }
  };

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h4" fontWeight={700} component="h1">
          {title}
        </Typography>
        <Typography color="text.secondary">{description}</Typography>
      </Stack>

      <Paper
        component="form"
        onSubmit={handleSubmitWithErrors}
        sx={{ p: { xs: 2, sm: 3 }, maxWidth: 720 }}
      >
        <Stack spacing={3}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <TextField
            label="ชื่อ-นามสกุล"
            value={values.name}
            onChange={handleChange("name")}
            required
            placeholder="เช่น สมชาย ใจดี"
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="อีเมลสำหรับเข้าสู่ระบบ"
              value={values.email}
              onChange={handleChange("email")}
              type="email"
              required
              fullWidth
              placeholder="name@example.com"
            />
            <TextField
              label="รหัสผ่านเริ่มต้น"
              value={values.password}
              onChange={handleChange("password")}
              type="password"
              required={requirePassword}
              helperText={
                requirePassword
                  ? "ใช้สำหรับเข้าสู่ระบบครั้งแรก สามารถเปลี่ยนได้ภายหลัง"
                  : "เว้นว่างไว้หากไม่ต้องการเปลี่ยนรหัสผ่าน"
              }
              fullWidth
            />
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="ตำแหน่งงาน"
              value={values.position}
              onChange={handleChange("position")}
              required
              fullWidth
            />
            <TextField
              select
              label="แผนก"
              value={values.department}
              onChange={handleChange("department")}
              required
              fullWidth
            >
              {departmentItems.map((department) => (
                <MenuItem key={department} value={department}>
                  {department}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="หมายเลขติดต่อ"
              value={values.phone}
              onChange={handleChange("phone")}
              required
              fullWidth
              placeholder="0xx-xxx-xxxx"
            />
            <TextField
              label="วันที่เริ่มงาน"
              value={values.startDate}
              onChange={handleChange("startDate")}
              type="date"
              InputLabelProps={{ shrink: true }}
              required
              fullWidth
            />
          </Stack>

          <TextField
            select
            label="สถานะการทำงาน"
            value={values.status}
            onChange={handleChange("status")}
            required
          >
            {statusOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            justifyContent="flex-end"
          >
            <Button
              component={Link}
              href="/dashboard/employees"
              variant="outlined"
              color="inherit"
            >
              ยกเลิก
            </Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {submitLabel}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}
