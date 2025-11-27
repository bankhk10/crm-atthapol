"use client";

import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  MenuItem,
  Pagination,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

import { hasPermission } from "@/lib/permissions";

import type { Option } from "../../orders/types";

type ForecastSummary = {
  id: string;
  name: string;
  year: number;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
  currency: string;
  totalRevenueTarget: number | null;
  totalQuantityTarget: number | null;
  updatedAt: string;
  notes?: string | null;
  salesperson?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    department?: string | null;
  } | null;
};

type ApiResponse = {
  items: ForecastSummary[];
  total: number;
  page: number;
  pageSize: number;
};

type Props = {
  employeeOptions: Option[];
};

const STATUS_OPTIONS = [
  { value: "ALL", label: "ทั้งหมด" },
  { value: "DRAFT", label: "ร่าง" },
  { value: "SUBMITTED", label: "ส่งอนุมัติ" },
  { value: "APPROVED", label: "อนุมัติ" },
  { value: "REJECTED", label: "ปฏิเสธ" },
];

const STATUS_COLOR: Record<string, { color: string; bg: string }> = {
  DRAFT: { color: "grey.900", bg: "grey.200" },
  SUBMITTED: { color: "primary.contrastText", bg: "primary.main" },
  APPROVED: { color: "common.white", bg: "success.main" },
  REJECTED: { color: "common.white", bg: "error.main" },
};

const numberFormatter = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function displayEmployee(option?: ForecastSummary["salesperson"] | null) {
  if (!option) return "-";
  const parts = [option.firstName ?? "", option.lastName ?? ""].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return option.id;
}

export function ForecastsClient({ employeeOptions }: Props) {
  const { data: session } = useSession();
  const canCreate = hasPermission(session?.user?.permissions, "sales", "create");
  const canEdit = hasPermission(session?.user?.permissions, "sales", "edit");
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [status, setStatus] = useState<string>("ALL");
  const [ownerId, setOwnerId] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [items, setItems] = useState<ForecastSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      params.set("year", String(year));
      if (status !== "ALL") params.set("status", status);
      if (ownerId) params.set("salespersonId", ownerId);
      const res = await fetch(`/api/sales/forecasts?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "โหลดข้อมูลไม่สำเร็จ");
      }
      const data = (await res.json()) as ApiResponse;
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, status, ownerId, page]);

  const handleRefresh = () => {
    setPage(1);
    load();
  };

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
        <Typography variant="h4" fontWeight={700} flexGrow={1}>
          Forecast
        </Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip title="รีเฟรช">
            <span>
              <IconButton onClick={handleRefresh} disabled={loading}>
                {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
              </IconButton>
            </span>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            component={Link}
            href="/dashboard/sales/forecasts/new"
            disabled={!canCreate}
          >
            สร้าง Forecast
          </Button>
        </Stack>
      </Stack>

      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            type="number"
            label="ปี"
            value={year}
            onChange={(e) => {
              const next = Number(e.target.value) || new Date().getFullYear();
              setYear(next);
              setPage(1);
            }}
            sx={{ maxWidth: 160 }}
          />
          <TextField
            select
            label="สถานะ"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            sx={{ minWidth: 180 }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="พนักงานรับผิดชอบ"
            value={ownerId}
            onChange={(e) => {
              setOwnerId(e.target.value);
              setPage(1);
            }}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">ทั้งหมด</MenuItem>
            {employeeOptions.map((opt) => (
              <MenuItem key={opt.id} value={opt.id}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ชื่อแผน</TableCell>
              <TableCell>ปี</TableCell>
              <TableCell>พนักงาน</TableCell>
              <TableCell>สถานะ</TableCell>
              <TableCell align="right">ยอดขายเป้า (บาท)</TableCell>
              <TableCell align="right">จำนวน (หน่วย)</TableCell>
              <TableCell>อัปเดตล่าสุด</TableCell>
              <TableCell align="right">จัดการ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  ไม่พบข้อมูล
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Typography fontWeight={600}>{item.name}</Typography>
                      {item.notes ? (
                        <Typography variant="body2" color="text.secondary">
                          {item.notes}
                        </Typography>
                      ) : null}
                    </Stack>
                  </TableCell>
                  <TableCell>{item.year}</TableCell>
                  <TableCell>{displayEmployee(item.salesperson)}</TableCell>
                  <TableCell>
                    <Chip
                      label={
                        STATUS_OPTIONS.find((s) => s.value === item.status)?.label || item.status
                      }
                      size="small"
                      sx={{
                        color: STATUS_COLOR[item.status]?.color ?? "text.primary",
                        bgcolor: STATUS_COLOR[item.status]?.bg ?? "grey.200",
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    {item.totalRevenueTarget != null
                      ? numberFormatter.format(item.totalRevenueTarget)
                      : "-"}
                  </TableCell>
                  <TableCell align="right">
                    {item.totalQuantityTarget != null
                      ? numberFormatter.format(item.totalQuantityTarget)
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {item.updatedAt ? dayjs(item.updatedAt).format("DD MMM YYYY HH:mm") : "-"}
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" justifyContent="flex-end">
                      <Tooltip title="ดูรายละเอียด">
                        <IconButton component={Link} href={`/dashboard/sales/forecasts/${item.id}`}>
                          <VisibilityOutlinedIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="แก้ไข">
                        <span>
                          <IconButton
                            component={Link}
                            href={`/dashboard/sales/forecasts/${item.id}`}
                            disabled={!canEdit}
                          >
                            <EditOutlinedIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Stack direction="row" justifyContent="flex-end">
        <Pagination
          count={totalPages}
          page={page}
          onChange={(_e, value) => setPage(value)}
          color="primary"
        />
      </Stack>
    </Stack>
  );
}
