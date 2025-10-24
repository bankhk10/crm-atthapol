"use client";

import type { Dispatch, SetStateAction } from "react";
import { Box, Stack, TextField, Typography, MenuItem, Paper, Button } from "@mui/material";
import CasinoIcon from "@mui/icons-material/Casino";
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
  const fillRandom = () => {
    const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    const choice = <T,>(arr: T[]) => arr[randInt(0, arr.length - 1)];
    const pad = (n: number, len: number) => String(n).padStart(len, "0");

    const firstNames = ["สมชาย", "วิชัย", "กิตติ", "อรทัย", "วาสนา", "ชลธิชา", "ปิยพงษ์", "สุรีย์พร", "นพดล", "ชุติมา"];
    const lastNames = ["ใจดี", "มีสุข", "วงศ์ไทย", "เกษมสุข", "ทวีทรัพย์", "สวัสดิ์", "ศรีทอง", "สุขสันต์", "รุ่งโรจน์", "รุ่งเรือง"];
    const prefixes = ["นาย", "นาง", "นางสาว"];
    const cropKinds = ["ข้าว", "มันสำปะหลัง", "ยางพารา", "อ้อย", "ข้าวโพด", "ผักสวนครัว"];
    const soilTypes = ["ดินร่วน", "ดินเหนียว", "ดินทราย"];
    const waterSources = ["ชลประทาน", "สระน้ำ", "บ่อบาดาล", "แม่น้ำ"];
    const streets = ["สุขุมวิท", "เพชรเกษม", "พหลโยธิน", "งามวงศ์วาน", "ลาดพร้าว", "รามคำแหง", "ศรีนครินทร์", "เจริญกรุง"]; 

    const prefix = choice(prefixes);
    const firstName = choice(firstNames);
    const lastName = choice(lastNames);
    const contactPhone = `0${String(randInt(600000000, 999999999))}`;
    const asciiId = (len: number) => Array.from({ length: len }, () => String.fromCharCode(97 + randInt(0, 25))).join("");
    const contactEmail = `${asciiId(6)}.${asciiId(4)}@mail.com`;

    const year = randInt(1965, 2003);
    const month = randInt(1, 12);
    const day = randInt(1, 28);
    const birthDate = `${year}-${pad(month, 2)}-${pad(day, 2)}`;

    const farmName = `ฟาร์ม${choice(["รุ่งเรือง", "พอเพียง", "สุขสันต์", "เขียวสดใส"])}`;
    const farmSize = String(randInt(5, 200));
    const cropType = choice(cropKinds);

    const genPlot = () => ({
      latitude: (Math.random() * (20.5 - 5.6) + 5.6).toFixed(6),
      longitude: (Math.random() * (105.7 - 97.3) + 97.3).toFixed(6),
      planting_area: String(randInt(1, 50)),
      crop_type: choice(cropKinds),
      crop_variety: choice(["พันธุ์ดี", "ไฮบริด", "ท้องถิ่น"]),
      soil_type: choice(soilTypes),
      water_source: choice(waterSources),
      machinery_used: [],
    });
    const farmPlots = [genPlot(), genPlot()];

    const address = `เลขที่ ${randInt(1, 199)}/ ${randInt(1, 20)} ซอย${choice(streets)} ถนน${choice(streets)}`;
    const province = choice(["นครราชสีมา", "บุรีรัมย์", "สุรินทร์", "เชียงใหม่", "เชียงราย"]);
    const district = "เมือง";
    const subdistrict = "ในเมือง";
    const postalCode = String(randInt(10000, 96150));

    setValues((prev) => ({
      ...prev,
      type: "FARMER",
      prefix,
      firstName,
      lastName,
      contactPhone,
      contactEmail,
      birthDate,
      farmName,
      farmSize,
      cropType,
      farmPlots,
      address,
      province,
      district,
      subdistrict,
      postalCode,
    }));
  };

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="flex-end">
        <Button type="button" variant="outlined" color="secondary" startIcon={<CasinoIcon />} onClick={fillRandom}>
          กรอกแบบสุ่ม
        </Button>
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
