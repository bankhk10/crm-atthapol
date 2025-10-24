"use client";

import type { Dispatch, SetStateAction } from "react";
import { Box, Stack, TextField, Typography, MenuItem, Button } from "@mui/material";
import CasinoIcon from "@mui/icons-material/Casino";
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
  const fillRandom = () => {
    const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    const choice = <T,>(arr: T[]) => arr[randInt(0, arr.length - 1)];
    const pad = (n: number, len: number) => String(n).padStart(len, "0");

    const firstNames = ["สมชาย", "วิชัย", "กิตติ", "อรทัย", "วาสนา", "ชลธิชา", "ปิยพงษ์", "สุรีย์พร", "นพดล", "ชุติมา"];
    const lastNames = ["ใจดี", "มีสุข", "วงศ์ไทย", "เกษมสุข", "ทวีทรัพย์", "สวัสดิ์", "ศรีทอง", "สุขสันต์", "รุ่งโรจน์", "รุ่งเรือง"];
    const prefixes = ["นาย", "นาง", "นางสาว"];
    const streets = ["สุขุมวิท", "เพชรเกษม", "พหลโยธิน", "งามวงศ์วาน", "ลาดพร้าว", "รามคำแหง", "ศรีนครินทร์", "เจริญกรุง"];

    const prefix = choice(prefixes);
    const firstName = choice(firstNames);
    const lastName = choice(lastNames);
    const contactPhone = `0${String(randInt(600000000, 999999999))}`;
    const contactEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@mail.com`;

    const year = randInt(1965, 2000);
    const month = randInt(1, 12);
    const day = randInt(1, 28);
    const birthDate = `${year}-${pad(month, 2)}-${pad(day, 2)}`;

    const farmSize = String(randInt(0, 300));
    const plantingCyclesPerYear = String(randInt(1, 5));
    const creditTermForFarmers = String(randInt(15, 120));
    const currentCropVolume = `${randInt(10, 500)} ตัน/ปี`;
    const farmerNetworkCount = String(randInt(10, 500));
    const plotCount = String(randInt(5, 100));
    const agriChemValuePerCycle = String(randInt(10000, 300000));
    const agriChemQtyPerCycle = String(randInt(100, 10000));
    const regularStore = ["ร้านเกษตรรุ่งเรือง", "ไทยการเกษตร", "กรีนฟีลด์", "ฟาร์มพลัส"][randInt(0,3)];
    const serviceTypes = ["ให้คำปรึกษา", "จัดหาสินค้า", "รับซื้อผลผลิต", "บริการฉีดพ่น"][randInt(0,3)];
    const brandsUsed = ["ยารักษ์พืช", "ไทยกรีน", "เกษตรโปร", "อีโคฟาร์ม"][randInt(0,3)];

    const address = `เลขที่ ${randInt(1, 199)}/ ${randInt(1, 20)} ซอย${streets[randInt(0,streets.length-1)]} ถนน${streets[randInt(0,streets.length-1)]}`;
    const province = ["นครราชสีมา", "บุรีรัมย์", "สุรินทร์", "เชียงใหม่", "เชียงราย"][randInt(0,4)];
    const district = "เมือง";
    const subdistrict = "ในเมือง";
    const postalCode = String(randInt(10000, 96150));

    setValues((prev) => ({
      ...prev,
      type: "BROKER",
      prefix,
      firstName,
      lastName,
      contactPhone,
      contactEmail,
      birthDate,
      farmSize,
      plantingCyclesPerYear,
      creditTermForFarmers,
      currentCropVolume,
      farmerNetworkCount,
      plotCount,
      agriChemValuePerCycle,
      agriChemQtyPerCycle,
      regularStore,
      serviceTypes,
      brandsUsed,
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
