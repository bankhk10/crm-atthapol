"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import {
  Paper,
  Stack,
  TextField,
  Typography,
  MenuItem,
  Button,
  Divider,
} from "@mui/material";
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
    <Paper
      component="form"
      onSubmit={handleSubmit}
      sx={{
        p: { xs: 2, sm: 3 },
        maxWidth: 900,
        mx: "auto", // จัดให้อยู่กลางแนวนอนของหน้า
      }}
    >
      {/* หัวข้อฟอร์ม */}
      <Typography
        variant="h4"
        fontWeight={800}
        align="center"
        sx={{ mt: 1, mb: 4 }}
      >
        เพิ่มข้อมูลสินค้าใหม่
      </Typography>
      <Divider  sx={{ mt: 1, mb: 4 }}/>

      <Stack spacing={2}>
        {error && <Typography color="error.main">{error}</Typography>}

        {/* รหัส + ชื่อสินค้า */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="รหัสสินค้า"
            required
            value={values.productCode}
            onChange={handleChange("productCode")}
            fullWidth
          />
          <TextField
            label="ชื่อสินค้า"
            required
            value={values.nameTH}
            onChange={handleChange("nameTH")}
            fullWidth
          />
        </Stack>

        {/* ราคา + จำนวน */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            type="number"
            label="ราคา"
            value={values.price ?? ""}
            onChange={handleChange("price")}
            fullWidth
          />
          <TextField
            type="number"
            label="จำนวนสินค้า"
            value={values.qtyOnHand ?? 0}
            onChange={handleChange("qtyOnHand")}
            fullWidth
          />
        </Stack>

        {/* หมวดหมู่ + แบรนด์ */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            select
            label="หมวดหมู่สินค้า"
            value={values.category}
            onChange={handleChange("category")}
            fullWidth
          >
            <MenuItem value="">
              <em>-</em>
            </MenuItem>
            {CATEGORY_OPTIONS.map((o) => (
              <MenuItem key={o} value={o}>
                {o}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="แบรนด์"
            value={values.brand}
            onChange={handleChange("brand")}
            fullWidth
          >
            <MenuItem value="">
              <em>-</em>
            </MenuItem>
            {BRAND_OPTIONS.map((o) => (
              <MenuItem key={o} value={o}>
                {o}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        {/* วันที่ผลิต + หมดอายุ */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={th}>
            <DatePicker
              label="วันที่ผลิต"
              value={values.mfgDate ? new Date(values.mfgDate) : null}
              onChange={(d) =>
                setValues((prev) => ({
                  ...prev,
                  mfgDate: d ? d.toISOString().slice(0, 10) : undefined,
                }))
              }
              slotProps={{ textField: { fullWidth: true } }}
            />
          </LocalizationProvider>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={th}>
            <DatePicker
              label="วันหมดอายุ"
              value={values.expDate ? new Date(values.expDate) : null}
              onChange={(d) =>
                setValues((prev) => ({
                  ...prev,
                  expDate: d ? d.toISOString().slice(0, 10) : undefined,
                }))
              }
              slotProps={{ textField: { fullWidth: true } }}
            />
          </LocalizationProvider>
        </Stack>

        {/* หน่วยนับ + สถานะ */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            select
            label="หน่วยนับ"
            value={values.unit}
            onChange={handleChange("unit")}
            fullWidth
          >
            {UNIT_OPTIONS.map((o) => (
              <MenuItem key={o} value={o}>
                {o}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="สถานะ"
            value={values.status}
            onChange={handleChange("status")}
            fullWidth
          >
            {STATUS_OPTIONS.map((o) => (
              <MenuItem key={o} value={o}>
                {o}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        {/* รายละเอียด */}
        <TextField
          label="รายละเอียดเพิ่มเติม (สินค้า)"
          value={values.description ?? ""}
          onChange={handleChange("description")}
          fullWidth
          multiline
          minRows={3}
        />
      </Stack>
      {/* ปุ่มบันทึก */}
      <Stack
        justifyContent="center"
        alignItems="center"
        sx={{ mt: 4 }} // 👈 เพิ่มระยะห่างด้านบน 32px
      >
        <Button
          type="submit"
          variant="contained"
          disabled={submitting}
          sx={{
            width: { xs: "100%", sm: 180 },
            borderRadius: 5,
            fontWeight: 700,
            py: 1.4,
            textTransform: "none",
            background: "linear-gradient(90deg, #54aef7ff 0%, #54aef7ff 100%)",
            boxShadow: "0 3px 6px rgba(0,0,0,0.15)",
            "&:hover": {
              background: "linear-gradient(90deg, #1976d2 0%, #1976d2 100%)",
              boxShadow: "0 4px 10px rgba(0,0,0,0.25)",
            },
          }}
        >
          {submitting ? "กำลังบันทึก..." : "บันทึกสินค้า"}
        </Button>
      </Stack>
    </Paper>
  );
}
