"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
  Divider,
  MenuItem,
  RadioGroup,
  Radio,
  FormControlLabel,
} from "@mui/material";
import Checkbox from "@mui/material/Checkbox";
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
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  // Sync company phone/email with personal for Farmer (hidden company section)
  useEffect(() => {
    if (values.type === "FARMER") {
      setValues((prev) => ({
        ...prev,
        phone: prev.contactPhone ?? prev.phone,
        email: prev.contactEmail ?? prev.email,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.type, values.contactPhone, values.contactEmail]);

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
    <Paper
      component="form"
      onSubmit={handleSubmitWithErrors}
      sx={{ p: { xs: 2, sm: 3 }, maxWidth: 960 }}
    >
      <Stack spacing={3}>
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
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

        {values.type === "FARMER" && (
          <>
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
                onChange={handleChange("prefix") as any}
                required
                sx={{ minWidth: { xs: "100%", sm: 150 } }}
              >
                <MenuItem value="นาย">นาย</MenuItem>
                <MenuItem value="นาง">นาง</MenuItem>
                <MenuItem value="นางสาว">นางสาว</MenuItem>
              </TextField>
              <TextField label="ชื่อ" value={values.firstName} onChange={handleChange("firstName")} required fullWidth />
              <TextField label="นามสกุล" value={values.lastName} onChange={handleChange("lastName")} required fullWidth />
            </Stack>

            {/* แถว 2: เบอร์/อีเมลส่วนบุคคล + วันเกิด + อายุ */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="เบอร์โทรศัพท์ (บุคคล)"
                value={values.contactPhone ?? ""}
                onChange={handleChange("contactPhone") as any}
                required
                fullWidth
              />
              <TextField
                label="E-mail (บุคคล)"
                type="email"
                value={values.contactEmail ?? ""}
                onChange={handleChange("contactEmail") as any}
                fullWidth
              />

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
                    ? String(Math.floor((Date.now() - new Date(values.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25)))
                    : ""
                }
                InputProps={{ readOnly: true }}
                sx={{ minWidth: { xs: "100%", sm: 100 } }}
              />
            </Stack>
          </>
        )}

        {values.type !== "FARMER" && (
          <>
            <Box sx={{ backgroundColor: "#d9d9dbff", borderRadius: 2, px: 2, py: 2 }}>
              <Typography variant="h6" fontWeight={960}>
                ข้อมูลบริษัท
              </Typography>
            </Box>

            {/* แถว 1: ชื่อร้านค้า, เลขผู้เสียภาษี, เบอร์โทร (บริษัท), E-mail (บริษัท) */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="ชื่อร้านค้า" value={values.companyName ?? ""} onChange={handleChange("companyName") as any} required fullWidth />
              <TextField label="เลขประจำตัวผู้เสียภาษี" value={values.taxId ?? ""} onChange={handleChange("taxId")} fullWidth />
              <TextField label="เบอร์โทรศัพท์ (บริษัท)" value={values.phone} onChange={handleChange("phone")} required fullWidth placeholder="0xx-xxx-xxxx" />
            </Stack>

            {/* แถว 2: ประเภท (ซ่อนในหน้าเพิ่ม), latitude, longitude */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="E-mail (บริษัท)" type="email" value={values.email} onChange={handleChange("email")} fullWidth placeholder="name@example.com" />
              <TextField label="latitude (ละติจูด)" type="number" inputProps={{ step: "any" }} value={values.latitude ?? ""} onChange={(e) => setValues((prev) => ({ ...prev, latitude: e.target.value }))} fullWidth />
              <TextField label="longitude (ลองจิจูด)" type="number" inputProps={{ step: "any" }} value={values.longitude ?? ""} onChange={(e) => setValues((prev) => ({ ...prev, longitude: e.target.value }))} fullWidth />
            </Stack>
          </>
        )}

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

        {/* <Stack direction="row" justifyContent="flex-end">
          <Button type="button" variant="outlined" startIcon={<MyLocationIcon />} onClick={handleFillCurrentLocation} disabled={isLocating}>
            {isLocating ? "กำลังดึงพิกัด..." : "ดึงพิกัดปัจจุบัน"}
          </Button>
        </Stack> */}

        {values.type !== "FARMER" && (
          <>
            <Box sx={{ backgroundColor: "#d9d9dbff", borderRadius: 2, px: 2, py: 2 }}>
              <Typography variant="h6" fontWeight={960}>
                ข้อมูลบุคคล
              </Typography>
            </Box>

            {/* แถว 1: คำนำหน้า, ชื่อ, นามสกุล */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField select label="คำนำหน้า" value={values.prefix} onChange={handleChange("prefix") as any} required sx={{ minWidth: { xs: "100%", sm: 150 } }}>
                <MenuItem value="นาย">นาย</MenuItem>
                <MenuItem value="นาง">นาง</MenuItem>
                <MenuItem value="นางสาว">นางสาว</MenuItem>
              </TextField>
              <TextField label="ชื่อ" value={values.firstName} onChange={handleChange("firstName")} required fullWidth placeholder="เช่น สมชาย" />
              <TextField label="นามสกุล" value={values.lastName} onChange={handleChange("lastName")} required fullWidth placeholder="เช่น ใจดี" />
            </Stack>

            {/* แถว 2: วันเกิด, อายุ, เบอร์โทร (บุคคล), E-mail (บุคคล) */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="เบอร์โทรศัพท์ (บุคคล)" value={values.contactPhone ?? ""} onChange={handleChange("contactPhone") as any} fullWidth placeholder="0xx-xxx-xxxx" />
              <TextField label="E-mail (บุคคล)" type="email" value={values.contactEmail ?? ""} onChange={handleChange("contactEmail") as any} fullWidth placeholder="name@example.com" />

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
                    ? String(Math.floor((Date.now() - new Date(values.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25)))
                    : ""
                }
                InputProps={{ readOnly: true }}
                sx={{ minWidth: { xs: "100%", sm: 100 } }}
              />
            </Stack>
          </>
        )}

        <Box sx={{ backgroundColor: "#d9d9dbff", borderRadius: 2, px: 2, py: 2 }}>
          <Typography variant="h6" fontWeight={960}>
            ข้อมูลเพิ่มเติม
          </Typography>
        </Box>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          {values.type === "DEALER" && (
            <TextField
              label="วงเงินเครดิต (บาท)"
              type="number"
              value={values.creditLimit ?? ""}
              onChange={handleChange("creditLimit") as any}
              fullWidth
            />
          )}
          {values.type === "SUBDEALER" && (
            <>
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
                  <TextField
                    {...params}
                    label="รับของจาก Dealer"
                    placeholder="ค้นหา Dealer"
                    fullWidth
                  />
                )}
                isOptionEqualToValue={(opt, val) => opt.id === val.id}
                fullWidth
              />
            </>
          )}
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
        </Stack>

        {values.type === "FARMER" && (
          <>
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
                    {/* retain hidden id so it round-trips */}
                    {plot && (plot as any).id && (
                      <input type="hidden" value={(plot as any).id} readOnly />
                    )}
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                      <TextField label="Latitude" type="number" inputProps={{ step: "any" }} value={plot.latitude ?? ""} onChange={(e) => {
                        const v = e.target.value;
                        setValues((prev) => {
                          const arr = [...(prev.farmPlots ?? [])];
                          arr[idx] = { ...arr[idx], latitude: v };
                          return { ...prev, farmPlots: arr };
                        });
                      }} fullWidth />
                      <TextField label="Longitude" type="number" inputProps={{ step: "any" }} value={plot.longitude ?? ""} onChange={(e) => {
                        const v = e.target.value;
                        setValues((prev) => {
                          const arr = [...(prev.farmPlots ?? [])];
                          arr[idx] = { ...arr[idx], longitude: v };
                          return { ...prev, farmPlots: arr };
                        });
                      }} fullWidth />
                      <TextField label="ขนาดพื้นที่เพาะปลูก (ไร่)" type="number" value={plot.planting_area ?? ""} onChange={(e) => {
                        const v = e.target.value;
                        setValues((prev) => {
                          const arr = [...(prev.farmPlots ?? [])];
                          arr[idx] = { ...arr[idx], planting_area: v };
                          return { ...prev, farmPlots: arr };
                        });
                      }} fullWidth />
                    </Stack>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                      <TextField label="ชนิดพืช" value={plot.crop_type ?? ""} onChange={(e) => {
                        const v = e.target.value;
                        setValues((prev) => {
                          const arr = [...(prev.farmPlots ?? [])];
                          arr[idx] = { ...arr[idx], crop_type: v };
                          return { ...prev, farmPlots: arr };
                        });
                      }} fullWidth />
                      <TextField label="สายพันธุ์" value={plot.crop_variety ?? ""} onChange={(e) => {
                        const v = e.target.value;
                        setValues((prev) => {
                          const arr = [...(prev.farmPlots ?? [])];
                          arr[idx] = { ...arr[idx], crop_variety: v };
                          return { ...prev, farmPlots: arr };
                        });
                      }} fullWidth />
                    </Stack>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                      <TextField label="ประเภทของดิน" value={plot.soil_type ?? ""} onChange={(e) => {
                        const v = e.target.value;
                        setValues((prev) => {
                          const arr = [...(prev.farmPlots ?? [])];
                          arr[idx] = { ...arr[idx], soil_type: v };
                          return { ...prev, farmPlots: arr };
                        });
                      }} fullWidth />
                      <TextField label="แหล่งน้ำ" value={plot.water_source ?? ""} onChange={(e) => {
                        const v = e.target.value;
                        setValues((prev) => {
                          const arr = [...(prev.farmPlots ?? [])];
                          arr[idx] = { ...arr[idx], water_source: v };
                          return { ...prev, farmPlots: arr };
                        });
                      }} fullWidth />
                    </Stack>
                    <Stack>
                      <Typography variant="body2" color="text.secondary">เครื่องจักรกลการเกษตรที่ใช้</Typography>
                      <Stack direction="row" spacing={2}>
                        {[
                          { key: "รถไถ", label: "รถไถ" },
                          { key: "โดรน", label: "โดรน" },
                        ].map((opt) => (
                          <FormControlLabel
                            key={opt.key}
                            control={<Checkbox checked={(plot.machinery_used ?? []).includes(opt.key)} onChange={(e) => {
                              const checked = e.target.checked;
                              setValues((prev) => {
                                const arr = [...(prev.farmPlots ?? [])];
                                const current = new Set(arr[idx]?.machinery_used ?? []);
                                if (checked) current.add(opt.key); else current.delete(opt.key);
                                arr[idx] = { ...arr[idx], machinery_used: Array.from(current) };
                                return { ...prev, farmPlots: arr };
                              });
                            }} />}
                            label={opt.label}
                          />
                        ))}
                      </Stack>
                    </Stack>
                    <Stack direction="row" justifyContent="flex-end">
                      <Button color="error" variant="outlined" onClick={() => {
                        setValues((prev) => ({
                          ...prev,
                          farmPlots: (prev.farmPlots ?? []).filter((_, i) => i !== idx),
                        }));
                      }}>ลบแปลงนี้</Button>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
              <Button variant="outlined" onClick={() => {
                setValues((prev) => ({
                  ...prev,
                  farmPlots: [...(prev.farmPlots ?? []), { latitude: "", longitude: "", planting_area: "", crop_type: "", crop_variety: "", soil_type: "", water_source: "", machinery_used: [] }],
                }));
              }}>เพิ่มข้อมูลแปลงเกษตร</Button>
            </Stack>
          </>
        )}

        {values.type === "DEALER" && (
          <>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="สินค้าหลักที่ขาย (คั่นด้วย ,)"
                value={values.mainProducts ?? ""}
                onChange={handleChange("mainProducts") as any}
                fullWidth
              />
              <TextField
                label="ยี่ห้อที่จำหน่าย (คั่นด้วย ,)"
                value={values.brandsSold ?? ""}
                onChange={handleChange("brandsSold") as any}
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="ยอดซื้อเฉลี่ย/เดือน"
                type="number"
                value={values.averageMonthlyPurchase ?? ""}
                onChange={handleChange("averageMonthlyPurchase") as any}
                fullWidth
              />
              <TextField
                label="คะแนนความสัมพันธ์"
                select
                value={(values.relationshipScore ?? "") as any}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    relationshipScore: Number(e.target.value),
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
                onChange={handleChange("businessNotes") as any}
                fullWidth
                multiline
                minRows={2}
              />
            </Stack>
          </>
        )}

        {values.type === "SUBDEALER" && (
          <>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="คู่แข่งหลัก"
                value={values.competitor ?? ""}
                onChange={handleChange("competitor") as any}
                fullWidth
              />
              <TextField
                label="พืชในพื้นที่"
                value={values.cropsInArea ?? ""}
                onChange={handleChange("cropsInArea") as any}
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="ยอดซื้อเฉลี่ย/เดือน"
                type="number"
                value={values.averageMonthlyPurchase ?? ""}
                onChange={handleChange("averageMonthlyPurchase") as any}
                fullWidth
              />
              <TextField
                label="สินค้าหลักที่ขาย"
                value={values.mainProducts ?? ""}
                onChange={handleChange("mainProducts") as any}
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="ยี่ห้อที่จำหน่าย"
                value={values.brandsSold ?? ""}
                onChange={handleChange("brandsSold") as any}
                fullWidth
              />
              <TextField
                label="ประเภทพื้นที่"
                value={values.areaType ?? ""}
                onChange={handleChange("areaType") as any}
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
                    relationshipScore: Number(e.target.value),
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
              onChange={handleChange("businessNotes") as any}
              fullWidth
              multiline
              minRows={2}
            />
          </>
        )}

        {/* ลบฟิลด์เฉพาะประเภทเพื่อให้ตรงกับเลย์เอาต์ตัวอย่าง */}

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
