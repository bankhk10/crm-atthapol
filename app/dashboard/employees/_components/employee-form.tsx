"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import type {
  EmployeeFormValues,
  EmployeeRoleOption,
  RoleDefinitionOption,
} from "../types";

export type EmployeeFormProps = {
  title: string;
  description: string;
  initialValues: EmployeeFormValues;
  roleOptions: EmployeeRoleOption[];
  roleDefinitions: RoleDefinitionOption[];
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
  roleOptions,
  roleDefinitions,
  submitLabel = "บันทึกข้อมูล",
  onSubmit,
  requirePassword = false,
}: EmployeeFormProps) {
  const [values, setValues] = useState<EmployeeFormValues>(initialValues);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const departmentItems = useMemo(
    () => [...departmentOptions].sort((a, b) => a.localeCompare(b)),
    []
  );

  const selectedRole = useMemo(
    () => roleOptions.find((option) => option.value === values.role),
    [roleOptions, values.role]
  );

  const selectedRoleDefinition = useMemo(
    () =>
      roleDefinitions.find(
        (definition) => definition.id === values.roleDefinitionId
      ) ?? null,
    [roleDefinitions, values.roleDefinitionId]
  );

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const handleChange =
    <Field extends keyof EmployeeFormValues>(field: Field) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setError(null);
      setValues((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleRoleDefinitionChange = (event: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const nextValue = event.target.value;
    setValues((prev) => ({
      ...prev,
      roleDefinitionId: nextValue ? nextValue : null,
    }));
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

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="ชื่อ"
              value={values.firstName ?? ""}
              onChange={handleChange("firstName")}
              required
              placeholder="เช่น สมชาย"
              fullWidth
            />
            <TextField
              label="นามสกุล"
              value={values.lastName ?? ""}
              onChange={handleChange("lastName")}
              required
              placeholder="เช่น ใจดี"
              fullWidth
            />
          </Stack>
          {/* legacy single name field kept for compatibility */}
          <TextField
            label="ชื่อ-นามสกุล (รวม)"
            value={values.name ?? `${values.firstName ?? ""} ${values.lastName ?? ""}`.trim()}
            onChange={handleChange("name")}
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
              label="รหัสพนักงาน"
              value={values.employeeCode ?? ""}
              onChange={handleChange("employeeCode")}
              required
              placeholder="เช่น EMP-0001"
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

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="วันเกิด"
              value={values.birthDate ?? ""}
              onChange={handleChange("birthDate")}
              type="date"
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="อายุ"
              value={
                typeof values.age === "number" && values.age >= 0
                  ? String(values.age)
                  : values.birthDate
                  ? String(
                      Math.floor(
                        (Date.now() - new Date(values.birthDate).getTime()) /
                          (1000 * 60 * 60 * 24 * 365.25)
                      )
                    )
                  : ""
              }
              InputProps={{ readOnly: true }}
              fullWidth
            />
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              select
              label="เพศ"
              value={values.gender ?? ""}
              onChange={handleChange("gender") as any}
              fullWidth
            >
              <MenuItem value="">ไม่ระบุ</MenuItem>
              <MenuItem value="MALE">ชาย</MenuItem>
              <MenuItem value="FEMALE">หญิง</MenuItem>
              <MenuItem value="OTHER">อื่นๆ</MenuItem>
            </TextField>
            <TextField
              label="สังกัดบริษัท"
              value={values.company ?? ""}
              onChange={handleChange("company")}
              fullWidth
            />
            <TextField
              label="เขตที่รับผิดชอบ"
              value={values.responsibilityArea ?? ""}
              onChange={handleChange("responsibilityArea")}
              fullWidth
            />
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              select
              label="บทบาทผู้ใช้งาน"
              value={values.role}
              onChange={handleChange("role")}
              required
              fullWidth
              helperText={selectedRole?.description ?? undefined}
            >
              {roleOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  <Stack spacing={0.5}>
                    <Typography fontWeight={600}>{option.label}</Typography>
                    {option.description && (
                      <Typography variant="body2" color="text.secondary">
                        {option.description}
                      </Typography>
                    )}
                  </Stack>
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="สิทธิ์การใช้งาน"
              value={values.roleDefinitionId ?? ""}
              onChange={handleRoleDefinitionChange}
              fullWidth
              helperText={
                roleDefinitions.length === 0
                  ? "ยังไม่มีสิทธิ์การใช้งานที่สร้างไว้"
                  : "เลือกสิทธิ์เพื่อกำหนดขอบเขตการใช้งาน"
              }
              disabled={roleDefinitions.length === 0}
            >
              <MenuItem value="">ไม่กำหนด (ใช้ตามบทบาทหลัก)</MenuItem>
              {roleDefinitions.map((definition) => (
                <MenuItem key={definition.id} value={definition.id}>
                  <Stack spacing={0.5}>
                    <Typography fontWeight={600}>{definition.name}</Typography>
                    {definition.description && (
                      <Typography variant="body2" color="text.secondary">
                        {definition.description}
                      </Typography>
                    )}
                  </Stack>
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          {roleDefinitions.length === 0 ? (
            <Alert severity="info">
              ยังไม่มีการสร้างสิทธิ์การใช้งาน กรุณาสร้างจากเมนูบทบาทก่อน
            </Alert>
          ) : selectedRoleDefinition ? (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={1.5}>
                <Stack spacing={0.5}>
                  <Typography fontWeight={600}>
                    {selectedRoleDefinition.name}
                  </Typography>
                  {selectedRoleDefinition.description && (
                    <Typography color="text.secondary">
                      {selectedRoleDefinition.description}
                    </Typography>
                  )}
                </Stack>

                {selectedRoleDefinition.permissions.length > 0 ? (
                  <Stack spacing={2}>
                    {selectedRoleDefinition.permissions.map((group) => (
                      <Stack key={group.category} spacing={1}>
                        <Typography fontWeight={600}>
                          {group.category}
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={1}
                          flexWrap="wrap"
                          useFlexGap
                        >
                          {group.items.map((item) => (
                            <Chip key={item} label={item} size="small" />
                          ))}
                        </Stack>
                      </Stack>
                    ))}
                  </Stack>
                ) : (
                  <Typography color="text.secondary">
                    ยังไม่มีการกำหนดสิทธิ์สำหรับรายการนี้
                  </Typography>
                )}
              </Stack>
            </Paper>
          ) : (
            <Typography color="text.secondary">
              เลือกสิทธิ์การใช้งานเพื่อดูรายละเอียดของสิทธิ์ที่ได้รับ
            </Typography>
          )}

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
