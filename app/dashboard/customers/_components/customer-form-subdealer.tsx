"use client";

import type { Dispatch, SetStateAction } from "react";
import { Box, Stack, TextField, Typography, MenuItem } from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { th } from "date-fns/locale";

import type { CustomerFormValues } from "../types";

type SubDealerFormSectionProps = {
  values: CustomerFormValues;
  setValues: Dispatch<SetStateAction<CustomerFormValues>>;
  fieldErrors: Record<string, string>;
  handleChange: (field: keyof CustomerFormValues) => (e: any) => void;
  dealerOptions?: { id: string; label: string }[];
};

export default function SubDealerFormSection({
  values,
  setValues,
  fieldErrors,
  handleChange,
  dealerOptions = [],
}: SubDealerFormSectionProps) {
  return (
    <Stack spacing={3}>
      <Box sx={{ backgroundColor: "#d9d9dbff", borderRadius: 2, px: 2, py: 2 }}>
        <Typography variant="h6" fontWeight={960}>
          ข้อมูลบริษัท
        </Typography>
      </Box>

      {/* แถว 1: ชื่อร้านค้า, เลขผู้เสียภาษี, เบอร์โทร (บริษัท) */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          label="ชื่อร้านค้า"
          value={values.companyName ?? ""}
          onChange={handleChange("companyName")}
          required
          fullWidth
        />
        <TextField
          label="เลขประจำตัวผู้เสียภาษี"
          value={values.taxId ?? ""}
          onChange={handleChange("taxId")}
          fullWidth
        />
        <TextField
          label="เบอร์โทรศัพท์ (บริษัท)"
          value={values.phone}
          onChange={handleChange("phone")}
          required
          fullWidth
          placeholder="0xx-xxx-xxxx"
          error={Boolean(fieldErrors.phone)}
          helperText={fieldErrors.phone}
        />
      </Stack>

      {/* แถว 2: E-mail (บริษัท), latitude, longitude */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          label="E-mail (บริษัท)"
          type="email"
          value={values.email}
          onChange={handleChange("email")}
          fullWidth
          placeholder="name@example.com"
          error={Boolean(fieldErrors.email)}
          helperText={fieldErrors.email}
        />
        <TextField
          label="latitude (ละติจูด)"
          type="number"
          inputProps={{ step: "any" }}
          value={values.latitude ?? ""}
          onChange={(e) => setValues((prev) => ({ ...prev, latitude: e.target.value }))}
          fullWidth
        />
        <TextField
          label="longitude (ลองจิจูด)"
          type="number"
          inputProps={{ step: "any" }}
          value={values.longitude ?? ""}
          onChange={(e) => setValues((prev) => ({ ...prev, longitude: e.target.value }))}
          fullWidth
        />
      </Stack>

      <Box sx={{ backgroundColor: "#d9d9dbff", borderRadius: 2, px: 2, py: 2 }}>
        <Typography variant="h6" fontWeight={960}>
          ข้อมูลบุคคล
        </Typography>
      </Box>

      {/* แถว 1: คำนำหน้า, ชื่อ, นามสกุล */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          select
          label="คำนำหน้า"
          value={values.prefix}
          onChange={handleChange("prefix")}
          required
          sx={{ minWidth: { xs: "100%", sm: 150 } }}
        >
          <MenuItem value="นาย">นาย</MenuItem>
          <MenuItem value="นาง">นาง</MenuItem>
          <MenuItem value="นางสาว">นางสาว</MenuItem>
        </TextField>
        <TextField
          label="ชื่อ"
          value={values.firstName}
          onChange={handleChange("firstName")}
          required
          fullWidth
          placeholder="เช่น สมชาย"
        />
        <TextField
          label="นามสกุล"
          value={values.lastName}
          onChange={handleChange("lastName")}
          required
          fullWidth
          placeholder="เช่น ใจดี"
        />
      </Stack>

      {/* แถว 2: วันเกิด, อายุ, เบอร์ส่วนตัว, อีเมลส่วนตัว */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={th}>
          <DatePicker
            label="วันเกิด"
            value={values.birthDate ? new Date(values.birthDate) : null}
            onChange={(newValue) => {
              setValues((prev) => ({
                ...prev,
                birthDate: newValue ? newValue.toISOString().slice(0, 10) : "",
              }));
            }}
            slotProps={{ textField: { fullWidth: true } }}
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
          sx={{ minWidth: { xs: "100%", sm: 100 } }}
        />
        <TextField
          label="เบอร์โทรศัพท์ (บุคคล)"
          value={values.contactPhone ?? ""}
          onChange={handleChange("contactPhone")}
          fullWidth
          placeholder="0xx-xxx-xxxx"
        />
        <TextField
          label="E-mail (บุคคล)"
          type="email"
          value={values.contactEmail ?? ""}
          onChange={handleChange("contactEmail")}
          fullWidth
          placeholder="name@example.com"
        />
      </Stack>

      <Box sx={{ backgroundColor: "#d9d9dbff", borderRadius: 2, px: 2, py: 2 }}>
        <Typography variant="h6" fontWeight={960}>
          ข้อมูลเพิ่มเติม (Sub-Dealer)
        </Typography>
      </Box>

      <Autocomplete
        options={dealerOptions}
        getOptionLabel={(o) => o.label}
        value={dealerOptions.find((d) => d.id === (values.dealerId ?? "")) ?? null}
        onChange={(_e, opt) =>
          setValues((prev) => ({
            ...prev,
            dealerId: opt ? opt.id : undefined,
          }))
        }
        renderInput={(params) => (
          <TextField {...params} label="รับของจาก Dealer" placeholder="ค้นหา Dealer" fullWidth />
        )}
        isOptionEqualToValue={(opt, val) => opt.id === val.id}
        fullWidth
      />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          label="คู่แข่งหลัก"
          value={values.competitor ?? ""}
          onChange={handleChange("competitor")}
          fullWidth
        />
        <TextField
          label="พืชในพื้นที่"
          value={values.cropsInArea ?? ""}
          onChange={handleChange("cropsInArea")}
          fullWidth
        />
      </Stack>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          label="ยอดซื้อเฉลี่ย/เดือน"
          type="number"
          value={values.averageMonthlyPurchase ?? ""}
          onChange={handleChange("averageMonthlyPurchase")}
          fullWidth
        />
        <TextField
          label="สินค้าหลักที่ขาย"
          value={values.mainProducts ?? ""}
          onChange={handleChange("mainProducts")}
          fullWidth
        />
      </Stack>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          label="ยี่ห้อที่จำหน่าย"
          value={values.brandsSold ?? ""}
          onChange={handleChange("brandsSold")}
          fullWidth
        />
        <TextField
          label="ประเภทพื้นที่"
          value={values.areaType ?? ""}
          onChange={handleChange("areaType")}
          fullWidth
        />
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          select
          label="คะแนนความสัมพันธ์"
          value={(values.relationshipScore ?? "") as any}
          onChange={(e) =>
            setValues((prev) => ({
              ...prev,
              relationshipScore: Number((e.target as HTMLInputElement).value),
            }))
          }
          fullWidth
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <MenuItem key={n} value={n}>
              {n}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      <TextField
        label="หมายเหตุ"
        value={values.businessNotes ?? ""}
        onChange={handleChange("businessNotes")}
        fullWidth
        multiline
        minRows={2}
      />
    </Stack>
  );
}
