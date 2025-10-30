"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";
// Link removed; shared buttons will handle navigation
import { Alert, Button, Paper, Stack, TextField, Typography, Divider } from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import { Box } from "@mui/material";
import ThaiAddressPicker from "@/components/ThaiAddressPicker";

import type { CustomerFormValues } from "../types";
import DealerFormSection from "./customer-form-dealer";
import SubDealerFormSection from "./customer-form-subdealer";
import FarmerFormSection from "./customer-form-farmer";
import BrokerFormSection from "./customer-form-broker";
import { SaveBackButtons } from "@/components/SaveBackButtons";
import Loader from "@/components/Loader";

type CustomerFormProps = {
  title: string;
  description?: string;
  initialValues: CustomerFormValues;
  submitLabel?: string;
  onSubmit?: (values: CustomerFormValues) => Promise<void> | void;
  employeeOptions?: { id: string; label: string }[];
  dealerOptions?: { id: string; label: string }[];
  hideTypeSelect?: boolean;
};

export function CustomerForm({
  title,
  description = "",
  initialValues,
  submitLabel = "บันทึกข้อมูล",
  onSubmit,
  employeeOptions = [],
  dealerOptions = [],
  hideTypeSelect = false,
}: CustomerFormProps) {
  const [values, setValues] = useState<CustomerFormValues>(initialValues);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setValues(initialValues);
    setFieldErrors({});
  }, [initialValues]);

  // Keep company email (values.email) and personal email (values.contactEmail) separate — do not auto-sync.

  const handleChange =
    <Field extends keyof CustomerFormValues>(field: Field) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setError(null);
      setValues((prev) => ({ ...prev, [field]: event.target.value }));
      setFieldErrors((prev) => {
        if (!prev[field as string]) return prev;
        const copy = { ...prev } as Record<string, string>;
        delete copy[field as string];
        return copy;
      });
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
      // Try to parse validation error payload from server action
      try {
        const data = JSON.parse(message);
        if (data && data.code === "VALIDATION_ERROR") {
          setFieldErrors(data.fieldErrors || {});
          setError("กรุณากรอกข้อมูลให้ครบถ้วน");
          return;
        }
      } catch (_) {
        // not a JSON validation error; fall through
      }
      setError(message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง");
    }
  };

  return (
    <Paper
      component="form"
      onSubmit={handleSubmitWithErrors}
      sx={{ p: { xs: 2, sm: 3 }, maxWidth: 960 }}
    >
      <Stack spacing={3}>
        {(error || Object.keys(fieldErrors).length > 0) && (
          <Alert
            severity="error"
            onClose={() => {
              setError(null);
              setFieldErrors({});
            }}
          >
            <Stack spacing={0.5}>
              <span>{error || "กรุณากรอกข้อมูลให้ครบถ้วน"}</span>
              {Object.keys(fieldErrors).length > 0 && (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {Object.entries(fieldErrors).map(([key, msg]) => (
                    <li key={key}>{msg}</li>
                  ))}
                </ul>
              )}
            </Stack>
          </Alert>
        )}

        <Stack spacing={1} alignItems="center">
          <Typography variant="h4" fontWeight={700} component="h1" align="center">
            {title + " " + values.type}
          </Typography>
          <Typography color="text.secondary" align="center">
            {description}
          </Typography>
        </Stack>

        <Divider />

        {/* ฟอร์มย่อยตามประเภท */}
        {values.type === "DEALER" && (
          <DealerFormSection
            values={values}
            setValues={setValues}
            fieldErrors={fieldErrors}
            handleChange={(field) => handleChange(field as any)}
            employeeOptions={employeeOptions}
          />
        )}
        {values.type === "SUBDEALER" && (
          <SubDealerFormSection
            values={values}
            setValues={setValues}
            fieldErrors={fieldErrors}
            handleChange={(field) => handleChange(field as any)}
            dealerOptions={dealerOptions}
            employeeOptions={employeeOptions}
          />
        )}
        {values.type === "FARMER" && (
          <FarmerFormSection
            values={values}
            setValues={setValues}
            fieldErrors={fieldErrors}
            handleChange={(field) => handleChange(field as any)}
          />
        )}
        {values.type === "BROKER" && (
          <BrokerFormSection
            values={values}
            setValues={setValues}
            fieldErrors={fieldErrors}
            handleChange={(field) => handleChange(field as any)}
          />
        )}

        {/* ส่วนกลาง: ที่อยู่ */}
        <Box sx={{ backgroundColor: "#d9d9dbff", borderRadius: 2, px: 2, py: 2 }}>
          <Typography variant="h6" fontWeight={960}>
            ที่อยู่
          </Typography>
        </Box>
        <TextField
          label="ที่อยู่ (บ้านเลขที่, หมู่, ซอย, ถนน)"
          value={values.address ?? ""}
          onChange={handleChange("address")}
          fullWidth
          placeholder="บ้านเลขที่ หมู่ ซอย ถนน"
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

        {/* ส่วนกลาง: พนักงานที่รับผิดชอบ (เฉพาะ FARMER/BROKER) */}
        {(values.type === "FARMER" || values.type === "BROKER") && (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Autocomplete
              options={employeeOptions}
              getOptionLabel={(option) => option.label}
              value={
                employeeOptions.find((opt) => opt.id === (values.responsibleEmployeeId ?? "")) ??
                null
              }
              onChange={(_e, option) =>
                setValues((prev) => ({ ...prev, responsibleEmployeeId: option ? option.id : null }))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="พนักงานที่รับผิดชอบ"
                  placeholder="ค้นหาชื่อพนักงาน"
                  fullWidth
                />
              )}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              fullWidth
            />
          </Stack>
        )}

        <SaveBackButtons
          backHref="/dashboard/customers"
          isSaving={isSubmitting}
          disabled={isSubmitting}
          saveLabel={submitLabel}
          saveButtonProps={{ type: "submit" as any, sx: { fontWeight: 800, px: 3 } }}
          backButtonProps={{ sx: { fontWeight: 800, px: 3 } }}
          justify="center"
        />
        {isSubmitting && <Loader fullscreen />}
      </Stack>
    </Paper>
  );
}
