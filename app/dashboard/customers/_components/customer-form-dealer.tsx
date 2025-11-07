"use client";

import { Box, Stack, TextField, Typography, MenuItem } from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { th } from "date-fns/locale";
import { useSession } from "next-auth/react";

import { FillRandomButton } from "@/components/FillRandomButton";
import { canShowRandomFill } from "@/lib/ui-permissions";

import type { CustomerFormValues } from "../types";
import type { Dispatch, SetStateAction } from "react";

type DealerFormSectionProps = {
  values: CustomerFormValues;
  setValues: Dispatch<SetStateAction<CustomerFormValues>>;
  fieldErrors: Record<string, string>;
  handleChange: (field: keyof CustomerFormValues) => (e: any) => void;
  employeeOptions?: { id: string; label: string }[];
};

export default function DealerFormSection({
  values,
  setValues,
  fieldErrors,
  handleChange,
  employeeOptions = [],
}: DealerFormSectionProps) {
  const { data: session } = useSession();
  const perms = session?.user?.permissions ?? [];
  const fillRandom = () => {
    const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    const choice = <T,>(arr: T[]) => arr[randInt(0, arr.length - 1)];
    const pad = (n: number, len: number) => String(n).padStart(len, "0");

    const companyPrefixes = ["บจก.", "หจก.", "บริษัท", "ห้างหุ้นส่วนจำกัด"];
    const companyBodies = [
      "สยามเทรดดิ้ง",
      "เกษตรรุ่งเรือง",
      "ไทยการเกษตร",
      "ดีลเลอร์เซ็นเตอร์",
      "เอสเคซัพพลาย",
    ];
    const firstNames = [
      "สมชาย",
      "วิชัย",
      "กิตติ",
      "อรทัย",
      "วาสนา",
      "ชลธิชา",
      "ปิยพงษ์",
      "สุรีย์พร",
      "นพดล",
      "ชุติมา",
    ];
    const lastNames = [
      "ใจดี",
      "มีสุข",
      "วงศ์ไทย",
      "เกษมสุข",
      "ทวีทรัพย์",
      "สวัสดิ์",
      "ศรีทอง",
      "สุขสันต์",
      "รุ่งโรจน์",
      "รุ่งเรือง",
    ];
    const streets = [
      "สุขุมวิท",
      "เพชรเกษม",
      "พหลโยธิน",
      "งามวงศ์วาน",
      "ลาดพร้าว",
      "รามคำแหง",
      "ศรีนครินทร์",
      "เจริญกรุง",
    ];

    const companyName = `${choice(companyPrefixes)} ${choice(companyBodies)}`;
    const taxId = Array.from({ length: 13 }, () => String(randInt(0, 9))).join("");
    const phone = `0${pad(randInt(800000000, 999999999), 9)}`;
    const contactPhone = `0${pad(randInt(600000000, 899999999), 9)}`;

    const firstName = choice(firstNames);
    const lastName = choice(lastNames);
    const asciiId = (len: number) =>
      Array.from({ length: len }, () => String.fromCharCode(97 + randInt(0, 25))).join("");
    const emailLocal = `${asciiId(6)}${randInt(1, 99)}`;
    const email = `${emailLocal}@example.com`;
    const contactEmail = `${asciiId(5)}.${asciiId(4)}@mail.com`;

    const lat = (Math.random() * (20.5 - 5.6) + 5.6).toFixed(6);
    const lng = (Math.random() * (105.7 - 97.3) + 97.3).toFixed(6);

    const prefixes = ["นาย", "นาง", "นางสาว"];
    const prefix = choice(prefixes);

    const year = randInt(1965, 2000);
    const month = randInt(1, 12);
    const day = randInt(1, 28);
    const birthDate = `${year}-${pad(month, 2)}-${pad(day, 2)}`;

    const creditLimit = String(randInt(50000, 500000));
    const promotionBudget = String(randInt(0, 50000));
    const relationshipScore = randInt(1, 5);
    const businessNotes = "ข้อมูลทดสอบ สร้างโดยการสุ่ม";

    const address = `เลขที่ ${randInt(1, 199)}/ ${randInt(1, 20)} ซอย${choice(streets)} ถนน${choice(streets)}`;
    const province = "กรุงเทพมหานคร";
    const district = "บางกะปิ";
    const subdistrict = "หัวหมาก";
    const postalCode = "10240";

    setValues((prev) => ({
      ...prev,
      type: "DEALER",
      companyName,
      taxId,
      phone,
      email,
      latitude: lat,
      longitude: lng,
      prefix,
      firstName,
      lastName,
      birthDate,
      contactPhone,
      contactEmail,
      creditLimit,
      promotionBudget,
      relationshipScore,
      businessNotes,
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
        {canShowRandomFill(perms, "customers", "create") && (
          <FillRandomButton onClick={fillRandom} />
        )}
      </Stack>
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
          ข้อมูลเพิ่มเติม (Dealer)
        </Typography>
      </Box>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          label="วงเงินเครดิต (บาท)"
          type="number"
          value={values.creditLimit ?? ""}
          onChange={handleChange("creditLimit")}
          fullWidth
        />
        <TextField
          label="วงเงินส่งเสริมการขาย (บาท)"
          type="number"
          value={values.promotionBudget ?? ""}
          onChange={handleChange("promotionBudget")}
          fullWidth
        />
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
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

        <TextField
          label="คะแนนความสัมพันธ์"
          select
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

      <Stack>
        <TextField
          label="หมายเหตุ"
          value={values.businessNotes ?? ""}
          onChange={handleChange("businessNotes")}
          fullWidth
          multiline
          minRows={2}
        />
      </Stack>
    </Stack>
  );
}
