"use client";

import type { Dispatch, SetStateAction } from "react";
import { Box, Stack, TextField, Typography, MenuItem } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { th } from "date-fns/locale";

import type { CustomerFormValues } from "../types";

type BrokerFormSectionProps = {
  values: CustomerFormValues;
  setValues: Dispatch<SetStateAction<CustomerFormValues>>;
  fieldErrors: Record<string, string>;
  handleChange: (field: keyof CustomerFormValues) => (e: any) => void;
};

export default function BrokerFormSection({
  values,
  setValues,
  fieldErrors,
  handleChange,
}: BrokerFormSectionProps) {
  return (
    <Stack spacing={3}>
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
          error={Boolean(fieldErrors.prefix)}
          helperText={fieldErrors.prefix}
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
          error={Boolean(fieldErrors.firstName)}
          helperText={fieldErrors.firstName}
        />
        <TextField
          label="นามสกุล"
          value={values.lastName}
          onChange={handleChange("lastName")}
          required
          fullWidth
          error={Boolean(fieldErrors.lastName)}
          helperText={fieldErrors.lastName}
        />
      </Stack>

      {/* แถว 2: เบอร์/อีเมลส่วนบุคคล + วันเกิด + อายุ */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          label="เบอร์โทรศัพท์ (บุคคล)"
          value={values.contactPhone ?? ""}
          onChange={handleChange("contactPhone")}
          required
          fullWidth
          error={Boolean(fieldErrors.contactPhone)}
          helperText={fieldErrors.contactPhone}
        />
        <TextField
          label="E-mail (บุคคล)"
          type="email"
          value={values.contactEmail ?? ""}
          onChange={handleChange("contactEmail")}
          fullWidth
          error={Boolean(fieldErrors.contactEmail)}
          helperText={fieldErrors.contactEmail}
        />

        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={th}>
          <DatePicker
            label="วันเกิด"
            value={values.birthDate ? new Date(values.birthDate) : null}
            views={["year", "month", "day"]}
            onChange={(newValue) => {
              setValues((prev) => ({
                ...prev,
                birthDate: newValue ? newValue.toISOString().slice(0, 10) : "",
              }));
            }}
            slotProps={{
              textField: {
                fullWidth: true,
                error: Boolean(fieldErrors.birthDate),
                helperText: fieldErrors.birthDate,
              },
            }}
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
      </Stack>

      <Box sx={{ backgroundColor: "#d9d9dbff", borderRadius: 2, px: 2, py: 2 }}>
        <Typography variant="h6" fontWeight={960}>
          ข้อมูล Broker
        </Typography>
      </Box>

      <Stack spacing={2}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="พืชหลัก (Crop Types)"
            value={values.cropType ?? ""}
            onChange={handleChange("cropType")}
            fullWidth
          />
          <TextField
            label="ปริมาณผลผลิตปัจจุบัน"
            value={values.currentCropVolume ?? ""}
            onChange={handleChange("currentCropVolume")}
            fullWidth
          />
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="จำนวนเกษตรกรในเครือ"
            type="number"
            value={values.farmerNetworkCount ?? ""}
            onChange={handleChange("farmerNetworkCount")}
            fullWidth
          />
          <TextField
            label="จำนวนแปลง"
            type="number"
            value={values.plotCount ?? ""}
            onChange={handleChange("plotCount")}
            fullWidth
          />
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="ขนาดพื้นที่รวม (ไร่)"
            type="number"
            value={values.farmSize ?? ""}
            onChange={handleChange("farmSize")}
            fullWidth
          />
          <TextField
            label="รอบปลูกต่อปี"
            type="number"
            value={values.plantingCyclesPerYear ?? ""}
            onChange={handleChange("plantingCyclesPerYear")}
            fullWidth
          />
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="เครดิตให้เกษตรกร (วัน)"
            type="number"
            value={values.creditTermForFarmers ?? ""}
            onChange={handleChange("creditTermForFarmers")}
            fullWidth
          />
          <TextField
            label="มูลค่าสารเคมี/รอบ (บาท)"
            type="number"
            value={values.agriChemValuePerCycle ?? ""}
            onChange={handleChange("agriChemValuePerCycle")}
            fullWidth
          />
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="ปริมาณสารเคมี/รอบ"
            type="number"
            value={values.agriChemQtyPerCycle ?? ""}
            onChange={handleChange("agriChemQtyPerCycle")}
            fullWidth
          />
          <TextField
            label="ร้านค้าประจำ"
            value={values.regularStore ?? ""}
            onChange={handleChange("regularStore")}
            fullWidth
          />
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="ประเภทบริการที่ให้"
            value={values.serviceTypes ?? ""}
            onChange={handleChange("serviceTypes")}
            fullWidth
          />
          <TextField
            label="ยี่ห้อที่ใช้"
            value={values.brandsUsed ?? ""}
            onChange={handleChange("brandsUsed")}
            fullWidth
          />
        </Stack>
      </Stack>
    </Stack>
  );
}
