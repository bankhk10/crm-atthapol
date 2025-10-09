"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

type ActivityItem = {
  id: string;
  code: string;
  title: string;
  createdAt: string; // ISO
  income: number;
  expense: number;
  days: number;
};

export function EmployeeActivity({ initialItems }: { initialItems: ActivityItem[] }) {
  const [filter, setFilter] = useState<string>("เดือนปัจจุบัน");
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [page, setPage] = useState(1);
  const itemsPerPage = 4;

  const items = useMemo(() => applyFilter(initialItems, filter), [initialItems, filter]);
  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));
  const start = (page - 1) * itemsPerPage;
  const pageItems = items.slice(start, start + itemsPerPage);
  const startDisplay = items.length ? start + 1 : 0;
  const endDisplay = Math.min(start + itemsPerPage, items.length);

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="flex-end">
        <Button
          variant="outlined"
          endIcon={<KeyboardArrowDownIcon />}
          onClick={(e) => setMenuAnchor(e.currentTarget)}
          sx={{ borderRadius: 2 }}
        >
          {filter}
        </Button>
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
        >
          {[
            "เดือนปัจจุบัน",
            "เดือนที่ผ่านมา",
            "3 เดือนล่าสุด",
            "ทั้งหมด",
          ].map((opt) => (
            <MenuItem
              key={opt}
              selected={opt === filter}
              onClick={() => {
                setFilter(opt);
                setMenuAnchor(null);
                setPage(1);
              }}
            >
              {opt}
            </MenuItem>
          ))}
        </Menu>
      </Stack>

      {pageItems.length === 0 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography color="text.secondary">ไม่พบกิจกรรม</Typography>
        </Paper>
      )}

      {pageItems.map((it) => (
        <Paper
          key={it.id}
          elevation={1}
          sx={{
            p: { xs: 2, md: 3 },
            borderRadius: 3,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1.2fr 1fr" },
            alignItems: "center",
            gap: 2,
          }}
        >
          {/* Left info */}
          <Stack spacing={1.25}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ position: "relative", width: 44, height: 44 }}>
                <Image src="/window.svg" alt="icon" fill style={{ objectFit: "contain" }} />
              </Box>
              <Stack spacing={0.25}>
                <Typography variant="caption" color="text.secondary">
                  {it.code}
                </Typography>
                <Typography variant="subtitle1" fontWeight={800}>
                  {it.title}
                </Typography>
              </Stack>
            </Stack>

            <Stack direction="row" spacing={1.25} alignItems="center">
              <CalendarMonthIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                วันที่สร้าง {formatDateTH(it.createdAt)}
              </Typography>
            </Stack>
          </Stack>

          {/* Right metrics */}
          <Box
            sx={{
              width: "100%",
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 2,
            }}
          >
            <Metric label="รายรับ" value={formatTHBCurrency(it.income)} />
            <Metric label="รายจ่าย" value={formatTHBCurrency(it.expense)} />
            <Metric label="รายได้สุทธิ" value={formatTHBCurrency(it.income - it.expense)} />
            <Metric label="ระยะเวลา" value={`${it.days} วัน`} />
          </Box>
        </Paper>
      ))}

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="body2" color="text.secondary">
          {startDisplay}-{endDisplay} จาก {items.length}
        </Typography>
        <Stack direction="row" spacing={1}>
          <IconButton disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            <ChevronLeftIcon />
          </IconButton>
          <IconButton disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
            <ChevronRightIcon />
          </IconButton>
        </Stack>
      </Stack>
    </Stack>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography fontWeight={700}>{value}</Typography>
    </Stack>
  );
}

function formatTHBCurrency(amount: number) {
  return `${amount.toLocaleString("th-TH")} บาท`;
}

function formatDateTH(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
}
function applyFilter(items: ActivityItem[], filter: string): ActivityItem[] {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  lastMonthEnd.setHours(23, 59, 59, 999);
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  const isInRange = (d: Date, start: Date, end: Date) => d >= start && d <= end;

  const filtered = items.filter((it) => {
    const d = new Date(it.createdAt);
    if (filter === "เดือนปัจจุบัน") {
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return isInRange(d, currentMonthStart, end);
    }
    if (filter === "เดือนที่ผ่านมา") {
      return isInRange(d, lastMonthStart, lastMonthEnd);
    }
    if (filter === "3 เดือนล่าสุด") {
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return isInRange(d, threeMonthsAgo, end);
    }
    return true;
  });

  // Sort by date desc
  filtered.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  return filtered;
}
