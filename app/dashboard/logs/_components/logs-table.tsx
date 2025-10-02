"use client";

import { useMemo, useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Box,
  Button,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  TablePagination,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

import type { AuditLogListItem } from "../types";

type LogsTableProps = {
  logs: AuditLogListItem[];
  total: number;
  page: number; // 1-based
  pageSize: number;
};

export function LogsTable({ logs, total, page, pageSize }: LogsTableProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [model, setModel] = useState<string>("");
  const [action, setAction] = useState<string>("");
  const [userId, setUserId] = useState<string>("");

  // Initialize local state from current URL once
  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    const m = searchParams.get("model") ?? "";
    const a = searchParams.get("action") ?? "";
    const u = searchParams.get("userId") ?? "";
    const sd = searchParams.get("startDate");
    const ed = searchParams.get("endDate");
    setQuery(q);
    setModel(m);
    setAction(a);
    setUserId(u);
    setStartDate(sd ? new Date(sd) : null);
    setEndDate(ed ? new Date(ed) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const modelOptions = useMemo(
    () => Array.from(new Set(logs.map((l) => l.model))).sort((a, b) => a.localeCompare(b)),
    [logs],
  );
  const actionOptions = useMemo(
    () => Array.from(new Set(logs.map((l) => l.action))).sort((a, b) => String(a).localeCompare(String(b))),
    [logs],
  );
  const userOptions = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>();
    logs.forEach((l) => {
      if (l.performedById) {
        const id = l.performedById;
        const label = l.performedByName ?? l.performedByEmail ?? id;
        if (!map.has(id)) map.set(id, { id, label });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [logs]);

  // Server-side filtering: the list received is already filtered by URL params
  const filteredLogs = logs;

  const handleSearch = () => {
    const next = new URLSearchParams(searchParams.toString());
    setParam(next, "q", query);
    router.push(`${pathname}?${next.toString()}`);
  };
  const handleQueryKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSearch();
    }
  };

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        spacing={2}
      >
        <Box>
          <Typography variant="h4" fontWeight={700} mb={0.5}>
            บันทึกการเปลี่ยนแปลง (Audit Logs)
          </Typography>
          <Typography color="text.secondary">
            ติดตามการสร้าง/แก้ไข/ลบ พร้อมชื่อผู้ใช้งานที่กระทำ
          </Typography>
        </Box>
      </Stack>

      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "flex-end" }}>
          <TextField
            label="ค้นหา log"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleQueryKeyDown}
            placeholder="พิมพ์โมเดล การกระทำ รหัสอ้างอิง หรือชื่อผู้ใช้"
            fullWidth
          />
          <Button variant="outlined" startIcon={<SearchIcon />} onClick={handleSearch} sx={{ minWidth: { sm: 160 } }}>
            ค้นหา
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} useFlexGap flexWrap="wrap">
          <TextField
            select
            label="โมเดล"
            value={model}
            onChange={(e) => {
              const v = e.target.value;
              setModel(v);
              const next = new URLSearchParams(searchParams.toString());
              setParam(next, "model", v);
              router.push(`${pathname}?${next.toString()}`);
            }}
            sx={{ minWidth: 200 }}
            SelectProps={{ native: true }}
          >
            <option value="">ทั้งหมด</option>
            {modelOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </TextField>
          <TextField
            select
            label="การกระทำ"
            value={action}
            onChange={(e) => {
              const v = e.target.value;
              setAction(v);
              const next = new URLSearchParams(searchParams.toString());
              setParam(next, "action", v);
              router.push(`${pathname}?${next.toString()}`);
            }}
            sx={{ minWidth: 200 }}
            SelectProps={{ native: true }}
          >
            <option value="">ทั้งหมด</option>
            {actionOptions.map((a) => (
              <option key={String(a)} value={String(a)}>
                {String(a)}
              </option>
            ))}
          </TextField>
          <TextField
            select
            label="ผู้ใช้งาน"
            value={userId}
            onChange={(e) => {
              const v = e.target.value;
              setUserId(v);
              const next = new URLSearchParams(searchParams.toString());
              setParam(next, "userId", v);
              router.push(`${pathname}?${next.toString()}`);
            }}
            sx={{ minWidth: 240 }}
            SelectProps={{ native: true }}
          >
            <option value="">ทั้งหมด</option>
            {userOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </TextField>
          <DateRangeInline
            startDate={startDate}
            endDate={endDate}
            onChangeStart={(d) => {
              setStartDate(d);
              const next = new URLSearchParams(searchParams.toString());
              setParam(next, "startDate", d ? toYmd(d) : "");
              router.push(`${pathname}?${next.toString()}`);
            }}
            onChangeEnd={(d) => {
              setEndDate(d);
              const next = new URLSearchParams(searchParams.toString());
              setParam(next, "endDate", d ? toYmd(d) : "");
              router.push(`${pathname}?${next.toString()}`);
            }}
          />
          <Button
            variant="text"
            color="inherit"
            onClick={() => {
              setModel("");
              setAction("");
              setUserId("");
              setStartDate(null);
              setEndDate(null);
              setQuery("");
              const next = new URLSearchParams();
              router.push(pathname);
            }}
          >
            ล้างตัวกรอง
          </Button>
        </Stack>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>วันที่เวลา</TableCell>
              <TableCell>โมเดล</TableCell>
              <TableCell>การกระทำ</TableCell>
              <TableCell>รหัสอ้างอิง</TableCell>
              <TableCell>ผู้ใช้งาน</TableCell>
              <TableCell align="right">ดูรายละเอียด</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredLogs.map((log) => (
              <TableRow key={log.id} hover>
                <TableCell>{new Date(log.performedAt).toLocaleString("th-TH")}</TableCell>
                <TableCell>{log.model}</TableCell>
                <TableCell>{log.action}</TableCell>
                <TableCell>{log.recordId ?? "-"}</TableCell>
                <TableCell>
                  <Stack spacing={0.25}>
                    <Typography fontWeight={600}>{log.performedByName ?? "-"}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {log.performedByEmail ?? "-"}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell align="right">
                  <Button component={Link} href={`/dashboard/logs/${log.id}`} variant="text">
                    รายละเอียด
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filteredLogs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography textAlign="center" color="text.secondary" py={4}>
                    ไม่พบบันทึกการเปลี่ยนแปลงที่ตรงกับคำค้นหา
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          rowsPerPageOptions={[10, 20, 50, 100]}
          count={total}
          rowsPerPage={pageSize}
          page={Math.max(0, page - 1)}
          onPageChange={(_, newPage) => {
            const next = new URLSearchParams(searchParams.toString());
            setParam(next, "page", String(newPage + 1));
            router.push(`${pathname}?${next.toString()}`);
          }}
          onRowsPerPageChange={(e) => {
            const nextSize = Number.parseInt(e.target.value, 10);
            const next = new URLSearchParams(searchParams.toString());
            setParam(next, "pageSize", String(nextSize));
            // reset to page 1 on size change
            setParam(next, "page", "1");
            router.push(`${pathname}?${next.toString()}`);
          }}
        />
      </TableContainer>
    </Stack>
  );
}

function DateRangeInline({
  startDate,
  endDate,
  onChangeStart,
  onChangeEnd,
}: {
  startDate: Date | null;
  endDate: Date | null;
  onChangeStart: (d: Date | null) => void;
  onChangeEnd: (d: Date | null) => void;
}) {
  // Inline date pickers without needing the full LocalizationProvider in the page root
  // Use native input type=date for simplicity to avoid adding provider wrappers here.
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-end">
      <TextField
        type="date"
        label="วันที่เริ่ม"
        value={startDate ? toYmd(startDate) : ""}
        onChange={(e) => onChangeStart(e.target.value ? new Date(e.target.value) : null)}
        InputLabelProps={{ shrink: true }}
      />
      <TextField
        type="date"
        label="ถึงวันที่"
        value={endDate ? toYmd(endDate) : ""}
        onChange={(e) => onChangeEnd(e.target.value ? new Date(e.target.value) : null)}
        InputLabelProps={{ shrink: true }}
      />
    </Stack>
  );
}

function toYmd(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function setParam(sp: URLSearchParams, key: string, value: string) {
  if (value && value.length > 0) sp.set(key, value);
  else sp.delete(key);
}
