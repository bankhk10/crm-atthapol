"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Alert, Button, Paper, Stack, TextField, Typography, Divider, MenuItem } from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import { Box } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { th } from "date-fns/locale";
import ThaiAddressPicker from "@/components/ThaiAddressPicker";

import type { CustomerFormValues, CustomerType } from "../types";

type CustomerFormProps = {
  title: string;
  description?: string;
  initialValues: CustomerFormValues;
  submitLabel?: string;
  onSubmit?: (values: CustomerFormValues) => Promise<void> | void;
  employeeOptions?: { id: string; label: string }[];
};

export function CustomerForm({
  title,
  description = "",
  initialValues,
  submitLabel = "บันทึกข้อมูล",
  onSubmit,
  employeeOptions = [],
}: CustomerFormProps) {
  const [values, setValues] = useState<CustomerFormValues>(initialValues);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

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

  const handleFillCurrentLocation = async () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setError("เบราว์เซอร์ไม่รองรับการระบุตำแหน่ง (Geolocation)");
      return;
    }
    setIsLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setValues((prev) => ({
          ...prev,
          latitude: Number.isFinite(lat) ? lat.toFixed(6) : prev.latitude,
          longitude: Number.isFinite(lng) ? lng.toFixed(6) : prev.longitude,
        }));
        setIsLocating(false);
      },
      (err) => {
        let message = "ไม่สามารถดึงพิกัดได้";
        if (err.code === 1) message = "กรุณาอนุญาตการเข้าถึงตำแหน่งที่ตั้ง";
        else if (err.code === 2) message = "ไม่สามารถระบุตำแหน่งได้ โปรดลองใหม่";
        else if (err.code === 3) message = "หมดเวลาการร้องขอพิกัด โปรดลองใหม่";
        setError(message);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
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

        {/* customer type */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            select
            label="ประเภท*"
            value={values.type}
            onChange={(e) => {
              const nextType = (e.target.value || "DEALER") as CustomerType;
              setValues((prev) => ({ ...prev, type: nextType, profile: {} }));
            }}
            required
            sx={{ minWidth: { xs: "100%", sm: 200 } }}
          >
            <MenuItem value="DEALER">Dealer</MenuItem>
            <MenuItem value="SUBDEALER">SubDealer</MenuItem>
            <MenuItem value="FARMER">Farmer</MenuItem>
          </TextField>
        </Stack>

        {/* identity fields */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            select
            label="คำนำหน้า*"
            value={values.prefix}
            onChange={handleChange("prefix") as any}
            required
            sx={{ minWidth: { xs: "100%", sm: 150 } }}
          >
            <MenuItem value="นาย">นาย</MenuItem>
            <MenuItem value="นาง">นาง</MenuItem>
            <MenuItem value="นางสาว">นางสาว</MenuItem>
          </TextField>
          <TextField
            label="ชื่อ*"
            value={values.firstName}
            onChange={handleChange("firstName")}
            required
            fullWidth
            placeholder="เช่น สมชาย"
          />
          <TextField
            label="นามสกุล*"
            value={values.lastName}
            onChange={handleChange("lastName")}
            required
            fullWidth
            placeholder="เช่น ใจดี"
          />
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            select
            label="เพศ*"
            value={values.gender}
            onChange={handleChange("gender") as any}
            required
            fullWidth
          >
            <MenuItem value="MALE">ชาย</MenuItem>
            <MenuItem value="FEMALE">หญิง</MenuItem>
            <MenuItem value="OTHER">อื่นๆ</MenuItem>
          </TextField>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={th}>
            <DatePicker
              label="วันเกิด*"
              value={values.birthDate ? new Date(values.birthDate) : null}
              onChange={(newValue) => {
                setValues((prev) => ({
                  ...prev,
                  birthDate: newValue ? newValue.toISOString().slice(0, 10) : "",
                }));
              }}
              slotProps={{ textField: { fullWidth: true, required: true } }}
            />
          </LocalizationProvider>
          <TextField
            label="อายุ"
            value={
              values.birthDate
                ? String(
                    Math.floor(
                      (Date.now() - new Date(values.birthDate).getTime()) /
                        (1000 * 60 * 60 * 24 * 365.25),
                    ),
                  )
                : ""
            }
            InputProps={{ readOnly: true }}
            fullWidth
          />
        </Stack>

        {/* contact fields */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="เบอร์โทรศัพท์"
            value={values.phone}
            onChange={handleChange("phone")}
            required
            fullWidth
            placeholder="0xx-xxx-xxxx"
          />
          <TextField
            label="อีเมล"
            type="email"
            value={values.email}
            onChange={handleChange("email")}
            fullWidth
            placeholder="name@example.com"
          />
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
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

        <Stack direction="row" justifyContent="flex-end">
          <Button
            type="button"
            variant="outlined"
            startIcon={<MyLocationIcon />}
            onClick={handleFillCurrentLocation}
            disabled={isLocating}
          >
            {isLocating ? "กำลังดึงพิกัด..." : "ดึงพิกัดปัจจุบัน"}
          </Button>
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="ละติจูด (Latitude)"
            type="number"
            inputProps={{ step: "any" }}
            value={values.latitude ?? ""}
            onChange={(e) => setValues((prev) => ({ ...prev, latitude: e.target.value }))}
            fullWidth
          />
          <TextField
            label="ลองจิจูด (Longitude)"
            type="number"
            inputProps={{ step: "any" }}
            value={values.longitude ?? ""}
            onChange={(e) => setValues((prev) => ({ ...prev, longitude: e.target.value }))}
            fullWidth
          />
        </Stack>

        {/* type-specific fields */
        /* Dealer / SubDealer / Farmer */}
        {values.type === "DEALER" && (
          <>
            <Box sx={{ backgroundColor: "#d9d9dbff", borderRadius: 2, px: 2, py: 2 }}>
              <Typography variant="h6" fontWeight={960}>ข้อมูล Dealer</Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="รหัสร้านค้า"
                value={values.code ?? "จะสร้างอัตโนมัติเมื่อบันทึก"}
                InputProps={{ readOnly: true }}
                fullWidth
              />
              <Autocomplete
                options={employeeOptions}
                getOptionLabel={(option) => option.label}
                value={
                  employeeOptions.find((opt) => opt.id === (values.responsibleEmployeeId ?? "")) ?? null
                }
                onChange={(_e, option) =>
                  setValues((prev) => ({
                    ...prev,
                    responsibleEmployeeId: option ? option.id : null,
                  }))
                }
                renderInput={(params) => (
                  <TextField {...params} label="พนักงานที่รับผิดชอบ" placeholder="ค้นหาชื่อพนักงาน" fullWidth />
                )}
                isOptionEqualToValue={(opt, val) => opt.id === val.id}
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="ชื่อบริษัท/ร้านค้า"
                value={values.profile?.companyName ?? ""}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    profile: { ...prev.profile, companyName: e.target.value },
                  }))
                }
                fullWidth
              />
              <TextField
                label="ผู้ติดต่อหลัก"
                value={values.profile?.contactPerson ?? ""}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    profile: { ...prev.profile, contactPerson: e.target.value },
                  }))
                }
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="วงเงินเครดิต (บาท)"
                type="number"
                value={values.profile?.creditLimit ?? ""}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    profile: { ...prev.profile, creditLimit: e.target.value },
                  }))
                }
                fullWidth
              />
            </Stack>
          </>
        )}

        {values.type === "SUBDEALER" && (
          <>
            <Box sx={{ backgroundColor: "#d9d9dbff", borderRadius: 2, px: 2, py: 2 }}>
              <Typography variant="h6" fontWeight={960}>ข้อมูล SubDealer</Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="ร้านค้าตัวแทน (แม่ข่าย)"
                value={values.profile?.parentDealer ?? ""}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    profile: { ...prev.profile, parentDealer: e.target.value },
                  }))
                }
                fullWidth
              />
              <TextField
                label="รหัส SubDealer"
                value={values.profile?.subDealerCode ?? ""}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    profile: { ...prev.profile, subDealerCode: e.target.value },
                  }))
                }
                fullWidth
              />
            </Stack>
          </>
        )}

        {values.type === "FARMER" && (
          <>
            <Box sx={{ backgroundColor: "#d9d9dbff", borderRadius: 2, px: 2, py: 2 }}>
              <Typography variant="h6" fontWeight={960}>ข้อมูลเกษตรกร</Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="ชื่อฟาร์ม"
                value={values.profile?.farmName ?? ""}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    profile: { ...prev.profile, farmName: e.target.value },
                  }))
                }
                fullWidth
              />
              <TextField
                label="ขนาดพื้นที่ (ไร่)"
                type="number"
                value={values.profile?.farmSize ?? ""}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    profile: { ...prev.profile, farmSize: e.target.value },
                  }))
                }
                fullWidth
              />
            </Stack>
            <Stack>
              <TextField
                label="พืชหลัก"
                value={values.profile?.cropType ?? ""}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    profile: { ...prev.profile, cropType: e.target.value },
                  }))
                }
                fullWidth
              />
            </Stack>
          </>
        )}

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
