"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Box, FormControl, InputLabel, MenuItem, Select, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";

type PeriodType = "month" | "quarter";

const MONTHS = [
  { value: 1, label: "มกราคม" },
  { value: 2, label: "กุมภาพันธ์" },
  { value: 3, label: "มีนาคม" },
  { value: 4, label: "เมษายน" },
  { value: 5, label: "พฤษภาคม" },
  { value: 6, label: "มิถุนายน" },
  { value: 7, label: "กรกฎาคม" },
  { value: 8, label: "สิงหาคม" },
  { value: 9, label: "กันยายน" },
  { value: 10, label: "ตุลาคม" },
  { value: 11, label: "พฤศจิกายน" },
  { value: 12, label: "ธันวาคม" },
];

function currentYear() {
  return new Date().getFullYear();
}

function currentMonth() {
  return new Date().getMonth() + 1;
}

function monthToQuarter(m: number) {
  return Math.floor((m - 1) / 3) + 1;
}

export function ReportPeriodFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const initialType = (sp.get("periodType") as PeriodType) || "month";
  const initialYear = Number(sp.get("year") || currentYear());
  const initialMonth = Number(sp.get("month") || currentMonth());
  const initialQuarter = Number(sp.get("quarter") || monthToQuarter(initialMonth));

  const [type, setType] = useState<PeriodType>(initialType);
  const [year, setYear] = useState<number>(initialYear);
  const [month, setMonth] = useState<number>(initialMonth);
  const [quarter, setQuarter] = useState<number>(initialQuarter);

  const years = useMemo(() => {
    const y = currentYear();
    return Array.from({ length: 7 }, (_, i) => y - 3 + i);
  }, []);

  function updateQuery(next: { type?: PeriodType; year?: number; month?: number; quarter?: number }) {
    const params = new URLSearchParams(sp.toString());
    const nextType = next.type ?? type;
    params.set("periodType", nextType);
    params.set("year", String(next.year ?? year));

    if (nextType === "month") {
      params.set("month", String(next.month ?? month));
      params.delete("quarter");
    } else {
      params.set("quarter", String(next.quarter ?? quarter));
      params.delete("month");
    }

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <Box aria-busy={isPending ? true : undefined}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={type}
          onChange={(_, v: PeriodType | null) => {
            if (!v) return;
            setType(v);
            if (v === "month") {
              updateQuery({ type: v, month });
            } else {
              updateQuery({ type: v, quarter });
            }
          }}
        >
          <ToggleButton value="month">รายเดือน</ToggleButton>
          <ToggleButton value="quarter">รายไตรมาส</ToggleButton>
        </ToggleButtonGroup>

        {type === "month" ? (
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="month-label">เดือน</InputLabel>
            <Select
              labelId="month-label"
              label="เดือน"
              value={month}
              onChange={(e) => {
                const m = Number(e.target.value);
                setMonth(m);
                updateQuery({ month: m });
              }}
            >
              {MONTHS.map((m) => (
                <MenuItem key={m.value} value={m.value}>
                  {m.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : (
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="quarter-label">ไตรมาส</InputLabel>
            <Select
              labelId="quarter-label"
              label="ไตรมาส"
              value={quarter}
              onChange={(e) => {
                const q = Number(e.target.value);
                setQuarter(q);
                updateQuery({ quarter: q });
              }}
            >
              {[1, 2, 3, 4].map((q) => (
                <MenuItem key={q} value={q}>
                  {`ไตรมาส ${q}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel id="year-label">ปี</InputLabel>
          <Select
            labelId="year-label"
            label="ปี"
            value={year}
            onChange={(e) => {
              const y = Number(e.target.value);
              setYear(y);
              updateQuery({ year: y });
            }}
          >
            {years.map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Typography variant="caption" color="text.secondary" sx={{ ml: { sm: 1 } }}>
          เลือกช่วงเวลาเพื่อกรองรายงาน
        </Typography>
      </Stack>
    </Box>
  );
}

