"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
  TextField,
  MenuItem,
  TableSortLabel,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { th } from "date-fns/locale";
import AddIcon from "@mui/icons-material/Add";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SendIcon from "@mui/icons-material/Send";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";

type QuoteItem = {
  id: string;
  quoteNumber: string;
  quoteDate: string;
  validUntil?: string | null;
  grandTotal: number;
  status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED" | string;
  customer?: {
    id: string;
    companyName?: string | null;
    prefix?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  salesperson?: {
    id: string;
    prefix?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
};

export default function QuotationsClient() {
  const router = useRouter();
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("ALL");
  const [customer, setCustomer] = useState("");
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [orderBy, setOrderBy] = useState<string>("quoteDate");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page + 1));
      params.set("pageSize", String(rowsPerPage));
      params.set("sortBy", orderBy);
      params.set("sortDir", order);
      if (status && status !== "ALL") params.set("status", status);
      if (customer) params.set("customer", customer);
      if (dateFrom) params.set("quoteDateFrom", dateFrom);
      if (dateTo) params.set("quoteDateTo", dateTo);
      const res = await fetch(`/api/sales/quotations?${params.toString()}`);
      const data = await res.json();
      setItems(data.items || []);
      setTotal(Number(data.total || 0));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage]);

  function displayCustomerName(c?: QuoteItem["customer"]) {
    if (!c) return "-";
    return (
      c.companyName || [c.prefix, c.firstName, c.lastName].filter(Boolean).join(" ") || c.id
    );
  }

  function statusChipSx(s: string) {
    if (s === "ACCEPTED") return { color: "#fff", bgcolor: "#22C55E" } as const;
    if (s === "REJECTED" || s === "EXPIRED") return { color: "#fff", bgcolor: "#EF4444" } as const;
    if (s === "SENT") return { color: "#000", bgcolor: "#FACC15" } as const;
    return { color: "#424242", bgcolor: "#E0E0E0" } as const; // DRAFT/others
  }

  const columns: { id: keyof QuoteItem | "customerName" | "actions"; label: string; align?: "left" | "center" | "right"; width?: number; sortable?: boolean }[] = [
    { id: "quoteNumber", label: "เลขที่ QT", width: 150, sortable: true },
    { id: "quoteDate", label: "วันที่", width: 110, sortable: true },
    { id: "validUntil", label: "หมดอายุ", width: 110, sortable: true },
    { id: "customerName", label: "ลูกค้า", width: 200 },
    { id: "grandTotal", label: "ยอดรวม", align: "right", width: 120, sortable: true },
    { id: "status", label: "สถานะ", width: 110, sortable: true },
    { id: "actions", label: "", align: "center", width: 220 },
  ];

  const handleRequestSort = (property: string) => () => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  async function sendQuote(q: QuoteItem) {
    try {
      setBusyId(q.id);
      const res = await fetch(`/api/sales/quotations/${q.id}/send`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || "ส่งใบเสนอราคาไม่สำเร็จ");
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function convertToOrder(q: QuoteItem) {
    try {
      setBusyId(q.id);
      const res = await fetch(`/api/sales/quotations/${q.id}/convert-to-order`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || "แปลงเป็นใบสั่งขายไม่สำเร็จ");
      }
      const so = await res.json();
      router.push(`/dashboard/sales/orders/${so.id}`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" fontWeight={800}>ใบเสนอราคา</Typography>
        <Button component={Link} href="/dashboard/sales/quotations/create" variant="contained" startIcon={<AddIcon />}>สร้างใบเสนอราคา</Button>
      </Stack>

      {/* Filter Bar */}
      <Paper sx={{ p: 1.5 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ xs: "stretch", md: "center" }}>
          <TextField
            label="ชื่อลูกค้า"
            value={customer}
            onChange={(e) => { setCustomer(e.target.value); setPage(0); }}
            placeholder="พิมพ์เพื่อค้นหา"
            sx={{ minWidth: 220 }}
          />
          <TextField select label="สถานะ" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} sx={{ width: 180 }}>
            {(["ALL","DRAFT","SENT","ACCEPTED","REJECTED","EXPIRED"] as const).map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </TextField>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={th}>
            <DatePicker
              label="วันที่ตั้งแต่"
              value={dateFrom ? new Date(dateFrom) : null}
              onChange={(d) => { setDateFrom(d ? d.toISOString().slice(0,10) : null); setPage(0); }}
            />
          </LocalizationProvider>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={th}>
            <DatePicker
              label="ถึงวันที่"
              value={dateTo ? new Date(dateTo) : null}
              onChange={(d) => { setDateTo(d ? d.toISOString().slice(0,10) : null); setPage(0); }}
            />
          </LocalizationProvider>
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => { setCustomer(""); setStatus("ALL"); setDateFrom(null); setDateTo(null); setOrder("desc"); setOrderBy("quoteDate"); setPage(0); }}>ล้างตัวกรอง</Button>
        </Stack>
      </Paper>

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 900, tableLayout: "fixed" }}>
          <TableHead>
            <TableRow sx={{ bgcolor: "#ccccceff" }}>
              {columns.map((c) => (
                <TableCell key={String(c.id)} align={c.align ?? "left"} sx={{ width: c.width, fontWeight: 800 }}>
                  {c.sortable ? (
                    <TableSortLabel
                      active={orderBy === c.id}
                      direction={orderBy === c.id ? order : "asc"}
                      onClick={handleRequestSort(String(c.id))}
                    >
                      {c.label}
                    </TableSortLabel>
                  ) : (
                    c.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((q) => (
              <TableRow key={q.id} hover>
                <TableCell>
                  <Tooltip title={q.quoteNumber} arrow>
                    <span>{q.quoteNumber}</span>
                  </Tooltip>
                </TableCell>
                <TableCell>{q.quoteDate ? new Date(q.quoteDate).toLocaleDateString("th-TH") : "-"}</TableCell>
                <TableCell>{q.validUntil ? new Date(q.validUntil).toLocaleDateString("th-TH") : "-"}</TableCell>
                <TableCell>
                  <Tooltip title={displayCustomerName(q.customer)} arrow>
                    <span>{displayCustomerName(q.customer)}</span>
                  </Tooltip>
                </TableCell>
                <TableCell align="right">{Number(q.grandTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                <TableCell>
                  <Chip label={q.status} size="small" sx={statusChipSx(q.status)} />
                </TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={0.5} justifyContent="center">
                    <Tooltip title="ดูรายละเอียด" arrow>
                      <IconButton component={Link as any} href={`/dashboard/sales/quotations/${q.id}`} size="small" color="primary">
                        <VisibilityOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="แก้ไข" arrow>
                      <IconButton component={Link as any} href={`/dashboard/sales/quotations/${q.id}/edit`} size="small" color="secondary">
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="ส่งใบเสนอราคา" arrow>
                      <span>
                        <IconButton size="small" color="success" disabled={busyId === q.id || q.status === "SENT" || q.status === "ACCEPTED"} onClick={() => sendQuote(q)}>
                          <SendIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="แปลงเป็น SO" arrow>
                      <span>
                        <IconButton size="small" color="warning" disabled={busyId === q.id || q.status === "ACCEPTED"} onClick={() => convertToOrder(q)}>
                          <ShoppingCartIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}

            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <Box py={4} textAlign="center">
                    {loading ? <Box sx={{ display: "flex", justifyContent: "center" }}><Loader /></Box> : (
                      <Typography color="text.secondary">ยังไม่มีรายการ</Typography>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        rowsPerPageOptions={[5, 10, 20, 50]}
        count={total}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
      />

      {(loading || Boolean(busyId)) && <Loader fullscreen />}
    </Stack>
  );
}
