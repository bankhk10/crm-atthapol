"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Stack, TextField, MenuItem } from "@mui/material";

type AddressValue = {
  province?: string;
  district?: string;
  subdistrict?: string;
  postalCode?: string;
};

type Props = {
  value?: AddressValue;
  onChange?: (next: AddressValue) => void;
};

export default function ThaiAddressPicker({ value, onChange }: Props) {
  const [provinces, setProvinces] = useState<any[]>([]);
  const [province, setProvince] = useState<string | undefined>(value?.province);
  const [district, setDistrict] = useState<string | undefined>(value?.district);
  const [subdistrict, setSubdistrict] = useState<string | undefined>(
    value?.subdistrict
  );
  const [postalCode, setPostalCode] = useState<string | undefined>(
    value?.postalCode
  );

  // โหลดข้อมูลจังหวัด
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/thai-addresses");
        if (!res.ok) return;
        const json = await res.json();
        const normalized = (json as any[]).map((p) => ({
          id: p.id,
          name: p.name_th,
          districts: (p.districts || []).map((d: any) => ({
            id: d.id,
            name: d.name_th,
            subdistricts: (d.sub_districts || []).map((s: any) => ({
              id: s.id,
              name: s.name_th,
              postalCode: s.zip_code,
            })),
          })),
        }));
        setProvinces(normalized);
      } catch (e) {
        console.error("โหลดจังหวัดล้มเหลว", e);
      }
    })();
  }, []);

  const districts = useMemo(() => {
    const p = provinces.find((pp: any) => pp.name === province);
    return p ? p.districts : [];
  }, [province, provinces]);

  const subdistricts = useMemo(() => {
    const d = districts.find((dd: any) => dd.name === district);
    return d ? d.subdistricts : [];
  }, [district, districts]);

  // อัพเดทค่า postalCode อัตโนมัติ
  useEffect(() => {
    const p = provinces.find((pp: any) => pp.name === province);
    const d = p?.districts?.find((dd: any) => dd.name === district);
    const s = d?.subdistricts?.find((ss: any) => ss.name === subdistrict);
    setPostalCode(s?.postalCode);

    if (onChange) {
      onChange({ province, district, subdistrict, postalCode: s?.postalCode });
    }
  }, [province, district, subdistrict]);

  // sync ค่าเมื่อ parent ส่งมา
  useEffect(() => {
    if (!value) return;
    if (value.province !== undefined) setProvince(value.province);
    if (value.district !== undefined) setDistrict(value.district);
    if (value.subdistrict !== undefined) setSubdistrict(value.subdistrict);
    if (value.postalCode !== undefined) setPostalCode(value.postalCode);
  }, [value]);

  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
      <TextField
        select
        label="จังหวัด"
        value={province ?? ""}
        onChange={(e) => {
          setProvince(e.target.value || undefined);
          setDistrict(undefined);
          setSubdistrict(undefined);
        }}
        fullWidth
        SelectProps={{
          MenuProps: {
            PaperProps: {
              sx: {
                maxHeight: 350, // กำหนดความสูงสูงสุด
                width: 200, // ความกว้าง dropdown
              },
            },
          },
        }}
      >
        <MenuItem value="">-- เลือกจังหวัด --</MenuItem>
        {provinces.map((p: any) => (
          <MenuItem key={p.id} value={p.name}>
            {p.name}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        label="อำเภอ/เขต"
        value={district ?? ""}
        onChange={(e) => {
          setDistrict(e.target.value || undefined);
          setSubdistrict(undefined);
        }}
        disabled={!province}
        fullWidth
        SelectProps={{
          MenuProps: {
            PaperProps: {
              sx: {
                maxHeight: 350, // กำหนดความสูงสูงสุด
                width: 200, // ความกว้าง dropdown
              },
            },
          },
        }}
      >
        <MenuItem value="">
          -- {province ? "เลือกอำเภอ" : "เลือกจังหวัดก่อน"} --
        </MenuItem>
        {districts.map((d: any) => (
          <MenuItem key={d.id} value={d.name}>
            {d.name}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        label="ตำบล"
        value={subdistrict ?? ""}
        onChange={(e) => setSubdistrict(e.target.value || undefined)}
        disabled={!district}
        fullWidth
        SelectProps={{
          MenuProps: {
            PaperProps: {
              sx: {
                maxHeight: 350, // กำหนดความสูงสูงสุด
                width: 200, // ความกว้าง dropdown
              },
            },
          },
        }}
      >
        <MenuItem value="">
          -- {district ? "เลือกตำบล" : "เลือกอำเภอก่อน"} --
        </MenuItem>
        {subdistricts.map((s: any) => (
          <MenuItem key={s.id} value={s.name}>
            {s.name}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        label="รหัสไปรษณีย์"
        value={postalCode ?? ""}
        fullWidth
        InputProps={{ readOnly: true }}
      />
    </Stack>
  );
}
