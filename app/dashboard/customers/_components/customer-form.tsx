"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Button, Paper, Stack, TextField, Typography, Divider } from "@mui/material";
import { Box } from "@mui/material";
import ThaiAddressPicker from "@/components/ThaiAddressPicker";

import type { CustomerFormValues } from "../types";

type CustomerFormProps = {
  title: string;
  description?: string;
  initialValues: CustomerFormValues;
  submitLabel?: string;
  onSubmit?: (values: CustomerFormValues) => Promise<void> | void;
};

export function CustomerForm({
  title,
  description = "",
  initialValues,
  submitLabel = "บันทึกข้อมูล",
  onSubmit,
}: CustomerFormProps) {
  const [values, setValues] = useState<CustomerFormValues>(initialValues);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const handleChange =
    <Field extends keyof CustomerFormValues>(field: Field) =>
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
    <Paper component="form" onSubmit={handleSubmitWithErrors} sx={{ p: { xs: 2, sm: 3 }, maxWidth: 960 }}>
      <Stack spacing={3}>
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Stack spacing={1} alignItems="center">
          <Typography variant="h4" fontWeight={700} component="h1" align="center">
            {title}
          </Typography>
          <Typography color="text.secondary" align="center">
            {description}
          </Typography>
        </Stack>

        <Divider />

        <Box sx={{ backgroundColor: "#d9d9dbff", borderRadius: 2, px: 2, py: 2 }}>
          <Typography variant="h6" fontWeight={960}>ข้อมูลลูกค้า</Typography>
        </Box>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="ชื่อลูกค้า"
            value={values.name}
            onChange={handleChange("name")}
            required
            fullWidth
            placeholder="เช่น บริษัท เอ บี ซี จำกัด หรือ สมชาย ใจดี"
          />
          <TextField
            label="เบอร์โทรศัพท์"
            value={values.phone}
            onChange={handleChange("phone")}
            required
            fullWidth
            placeholder="0xx-xxx-xxxx"
          />
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="อีเมล"
            type="email"
            value={values.email}
            onChange={handleChange("email")}
            fullWidth
            placeholder="name@example.com"
          />
          <TextField
            label="เลขผู้เสียภาษี (ถ้ามี)"
            value={values.taxId ?? ""}
            onChange={handleChange("taxId")}
            fullWidth
          />
        </Stack>

        <TextField
          label="ที่อยู่"
          value={values.address ?? ""}
          onChange={handleChange("address")}
          fullWidth
          placeholder="เลขที่ หมู่ ซอย ถนน"
        />

        <Box>
          <ThaiAddressPicker
            value={{
              province: values.province,
              district: values.district,
              subdistrict: values.subdistrict,
              postalCode: values.postalCode,
            }}
            onChange={(next) => {
              setValues((prev) => ({
                ...prev,
                province: next.province,
                district: next.district,
                subdistrict: next.subdistrict,
                postalCode: next.postalCode ?? prev.postalCode,
              }));
            }}
          />
        </Box>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="flex-end">
          <Button component={Link} href="/dashboard/customers" variant="outlined" color="inherit">
            ยกเลิก
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {submitLabel}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

