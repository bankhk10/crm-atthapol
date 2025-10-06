"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Paper, Stack, TextField, Typography, MenuItem } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { th } from "date-fns/locale";

import type { ProductFormValues } from "../validation";

type Props = {
  initialValues: ProductFormValues;
  onSubmit?: (values: ProductFormValues) => Promise<void> | void;
};

const CATEGORY_OPTIONS = ["AA1", "BB2", "CC3"] as const;
const BRAND_OPTIONS = ["A", "B", "C"] as const;
const UNIT_OPTIONS = ["อัน", "ชิ้น", "ถุง"] as const;
const STATUS_OPTIONS = ["ACTIVE", "INACTIVE", "EXPIRED"] as const;

export function ProductForm({ initialValues, onSubmit }: Props) {
  const [values, setValues] = useState<ProductFormValues>(initialValues);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setValues(initialValues), [initialValues]);

  const handleChange =
    <K extends keyof ProductFormValues>(key: K) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      setError(null);
      setValues((prev) => ({ ...prev, [key]: e.target.value as any }));
    };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    try {
      setSubmitting(true);
      await onSubmit?.(values);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "บันทึกไม่สำเร็จ";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Paper component="form" onSubmit={handleSubmit} sx={{ p: { xs: 2, sm: 3 }, maxWidth: 900 }}>
      <Stack spacing={2}>
        <Typography variant="h5" fontWeight={800}>เพิ่มข้อมูลสินค้าใหม่</Typography>
        {error && <Typography color="error.main">{error}</Typography>}

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField label="รหัสสินค้า" required value={values.productCode} onChange={handleChange("productCode")} fullWidth />
          <TextField label="เลขที่ผลิตสินค้า" value={values.lotNumber ?? ""} onChange={handleChange("lotNumber")} fullWidth />
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField label="ชื่อสินค้า (ไทย)" required value={values.nameTH} onChange={handleChange("nameTH")} fullWidth />
          <TextField label="ชื่อสินค้า (อังกฤษ)" value={values.nameEN ?? ""} onChange={handleChange("nameEN")} fullWidth />
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField select label="หมวดหมู่สินค้า" value={values.category} onChange={handleChange("category")} fullWidth>
            {CATEGORY_OPTIONS.map((o) => (<MenuItem key={o} value={o}>{o}</MenuItem>))}
          </TextField>
          <TextField select label="brand" value={values.brand} onChange={handleChange("brand")} fullWidth>
            {BRAND_OPTIONS.map((o) => (<MenuItem key={o} value={o}>{o}</MenuItem>))}
          </TextField>
          <TextField select label="หน่วยนับ" value={values.unit} onChange={handleChange("unit")} fullWidth>
            {UNIT_OPTIONS.map((o) => (<MenuItem key={o} value={o}>{o}</MenuItem>))}
          </TextField>
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField type="number" label="ราคา" value={values.price ?? ""} onChange={handleChange("price")} fullWidth />
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={th}>
            <DatePicker
              label="วันที่ผลิต"
              value={values.mfgDate ? new Date(values.mfgDate) : null}
              onChange={(d) => setValues((prev) => ({ ...prev, mfgDate: d ? d.toISOString().slice(0,10) : undefined }))}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </LocalizationProvider>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={th}>
            <DatePicker
              label="วันหมดอายุ"
              value={values.expDate ? new Date(values.expDate) : null}
              onChange={(d) => setValues((prev) => ({ ...prev, expDate: d ? d.toISOString().slice(0,10) : undefined }))}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </LocalizationProvider>
          <TextField select label="สถานะ" value={values.status} onChange={handleChange("status")} fullWidth>
            {STATUS_OPTIONS.map((o) => (<MenuItem key={o} value={o}>{o}</MenuItem>))}
          </TextField>
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField type="number" label="สต็อกจริง" value={values.qtyOnHand ?? 0} onChange={handleChange("qtyOnHand")} fullWidth />
          <TextField type="number" label="สต็อกจอง" value={values.qtyReserved ?? 0} onChange={handleChange("qtyReserved")} fullWidth />
          <TextField type="number" label="สต็อกหลอก" value={values.qtyVirtual ?? 0} onChange={handleChange("qtyVirtual")} fullWidth />
        </Stack>
        <TextField label="รายละเอียดเพิ่มเติม (สต็อก)" value={values.stockNote ?? ""} onChange={handleChange("stockNote")} fullWidth />

        <TextField label="รูปภาพสินค้า (URL/Path)" value={values.imageUrl ?? ""} onChange={handleChange("imageUrl")} fullWidth />
        <TextField label="รายละเอียดเพิ่มเติม (สินค้า)" value={values.description ?? ""} onChange={handleChange("description")} fullWidth multiline minRows={3} />

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="flex-end">
          <TextField type="submit" value={submitting ? "กำลังบันทึก..." : "บันทึกสินค้า"} disabled={submitting} sx={{ width: { xs: '100%', sm: 220 } }} />
        </Stack>
      </Stack>
    </Paper>
  );
}
