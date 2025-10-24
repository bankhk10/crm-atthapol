"use client";

import type { Dispatch, SetStateAction } from "react";
import { Box, Stack, TextField, Typography, MenuItem, Paper } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { th } from "date-fns/locale";

import type { CustomerFormValues } from "../types";

type FarmerFormSectionProps = {
  values: CustomerFormValues;
  setValues: Dispatch<SetStateAction<CustomerFormValues>>;
  fieldErrors: Record<string, string>;
  handleChange: (field: keyof CustomerFormValues) => (e: any) => void;
};

export default function FarmerFormSection({
  values,
  setValues,
  fieldErrors,
  handleChange,
}: FarmerFormSectionProps) {
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
          ข้อมูลแปลงเกษตร
        </Typography>
      </Box>
      <Stack spacing={2}>
        {(values.farmPlots ?? []).map((plot, idx) => (
          <Paper key={idx} variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={2}>
              <Typography fontWeight={700}>แปลงที่ {idx + 1}</Typography>
              {/* hidden id for round-trip */}
              {plot && (plot as any).id && (
                <input type="hidden" value={(plot as any).id} readOnly />
              )}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Latitude"
                  type="number"
                  inputProps={{ step: "any" }}
                  value={plot.latitude ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setValues((prev) => {
                      const arr = [...(prev.farmPlots ?? [])];
                      arr[idx] = { ...arr[idx], latitude: v };
                      return { ...prev, farmPlots: arr };
                    });
                  }}
                  fullWidth
                />
                <TextField
                  label="Longitude"
                  type="number"
                  inputProps={{ step: "any" }}
                  value={plot.longitude ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setValues((prev) => {
                      const arr = [...(prev.farmPlots ?? [])];
                      arr[idx] = { ...arr[idx], longitude: v };
                      return { ...prev, farmPlots: arr };
                    });
                  }}
                  fullWidth
                />
                <TextField
                  label="ขนาดพื้นที่เพาะปลูก (ไร่)"
                  type="number"
                  value={plot.planting_area ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setValues((prev) => {
                      const arr = [...(prev.farmPlots ?? [])];
                      arr[idx] = { ...arr[idx], planting_area: v };
                      return { ...prev, farmPlots: arr };
                    });
                  }}
                  fullWidth
                />
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="ชนิดพืช"
                  value={plot.crop_type ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setValues((prev) => {
                      const arr = [...(prev.farmPlots ?? [])];
                      arr[idx] = { ...arr[idx], crop_type: v };
                      return { ...prev, farmPlots: arr };
                    });
                  }}
                  fullWidth
                />
                <TextField
                  label="สายพันธุ์"
                  value={plot.crop_variety ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setValues((prev) => {
                      const arr = [...(prev.farmPlots ?? [])];
                      arr[idx] = { ...arr[idx], crop_variety: v };
                      return { ...prev, farmPlots: arr };
                    });
                  }}
                  fullWidth
                />
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="ประเภทของดิน"
                  value={plot.soil_type ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setValues((prev) => {
                      const arr = [...(prev.farmPlots ?? [])];
                      arr[idx] = { ...arr[idx], soil_type: v };
                      return { ...prev, farmPlots: arr };
                    });
                  }}
                  fullWidth
                />
                <TextField
                  label="แหล่งน้ำ"
                  value={plot.water_source ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setValues((prev) => {
                      const arr = [...(prev.farmPlots ?? [])];
                      arr[idx] = { ...arr[idx], water_source: v };
                      return { ...prev, farmPlots: arr };
                    });
                  }}
                  fullWidth
                />
              </Stack>
            </Stack>
          </Paper>
        ))}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="ชื่อฟาร์ม"
            value={values.farmName ?? ""}
            onChange={handleChange("farmName")}
            fullWidth
          />
          <TextField
            label="ขนาดพื้นที่รวม (ไร่)"
            type="number"
            value={values.farmSize ?? ""}
            onChange={handleChange("farmSize")}
            fullWidth
          />
          <TextField
            label="พืชหลัก"
            value={values.cropType ?? ""}
            onChange={handleChange("cropType")}
            fullWidth
          />
        </Stack>
        <Stack>
          <button
            type="button"
            onClick={() => {
              setValues((prev) => ({
                ...prev,
                farmPlots: [
                  ...(prev.farmPlots ?? []),
                  {
                    latitude: "",
                    longitude: "",
                    planting_area: "",
                    crop_type: "",
                    crop_variety: "",
                    soil_type: "",
                    water_source: "",
                    machinery_used: [],
                  },
                ],
              }));
            }}
          >
            เพิ่มข้อมูลแปลงเกษตร
          </button>
        </Stack>
      </Stack>
    </Stack>
  );
}
