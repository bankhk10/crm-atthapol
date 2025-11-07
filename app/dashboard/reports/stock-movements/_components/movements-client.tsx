"use client";

import {
  Box,
  Chip,
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
  Button,
} from "@mui/material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { th } from "date-fns/locale";
import { useEffect, useMemo, useState } from "react";

export type Option = { id: string; label: string };

type Movement = {
  id: string;
  type: "RESERVE" | "RELEASE" | "ISSUE" | "RETURN" | string;
  qty: number;
  createdAt: string;
  note?: string | null;
  product?: {
    id: string;
    productCode?: string | null;
    nameTH?: string | null;
    unit?: string | null;
  } | null;
  stock?: { lotNumber?: string | null; mfgDate?: string | null; expDate?: string | null } | null;
  saleOrder?: { id: string; soNumber?: string | null } | null;
};

type Props = {
  productOptions: Option[];
  initialSaleOrderId?: string | null;
};

const TYPE_OPTIONS = [
  { value: "ALL", label: "ทั้งหมด" },
  { value: "RESERVE", label: "จอง" },
  { value: "RELEASE", label: "ปล่อยจอง" },
  { value: "ISSUE", label: "ตัดออก" },
  { value: "RETURN", label: "คืนเข้า" },
];

const TYPE_LABEL: Record<string, string> = {
  RESERVE: "จอง",
  RELEASE: "ปล่อยจอง",
  ISSUE: "ตัดออก",
  RETURN: "คืนเข้า",
};

export function MovementsClient({ productOptions, initialSaleOrderId }: Props) {
  const [items, setItems] = useState<Movement[]>([]);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [productId, setProductId] = useState<string>("");
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("pageSize", "50");
      if (typeFilter !== "ALL") params.set("type", typeFilter);
      if (productId) params.set("productId", productId);
      if (from) params.set("from", new Date(from).toISOString());
      if (to) params.set("to", new Date(to).toISOString());
      if (initialSaleOrderId) params.set("saleOrderId", initialSaleOrderId);
      const res = await fetch(`/api/reports/stock-movements?${params.toString()}`);
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, productId, from, to]);

  const selectedProduct = useMemo(
    () => productOptions.find((p) => p.id === productId) || null,
    [productOptions, productId],
  );

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight={700}>
        ความเคลื่อนไหวสต็อก (Stock Movements)
      </Typography>

      <Stack spacing={1}>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {TYPE_OPTIONS.map((t) => (
            <Chip
              key={t.value}
              label={t.label}
              color={typeFilter === t.value ? "primary" : "default"}
              onClick={() => setTypeFilter(t.value)}
            />
          ))}
        </Stack>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", sm: "center" }}
        >
          <TextField
            select
            label="สินค้า"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            sx={{ minWidth: 280 }}
          >
            <option value=""></option>
            {productOptions.map((p) => (
              // Using native option for simplicity
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </TextField>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={th}>
            <DatePicker
              label="ตั้งแต่"
              value={from ? new Date(from) : null}
              views={["year", "month", "day"]}
              onChange={(v) => setFrom(v ? v.toISOString().slice(0, 10) : null)}
              slotProps={{ textField: { size: "small" } }}
            />
            <DatePicker
              label="ถึง"
              value={to ? new Date(to) : null}
              views={["year", "month", "day"]}
              onChange={(v) => setTo(v ? v.toISOString().slice(0, 10) : null)}
              slotProps={{ textField: { size: "small" } }}
            />
          </LocalizationProvider>
          <Button
            color="inherit"
            onClick={() => {
              setTypeFilter("ALL");
              setProductId("");
              setFrom(null);
              setTo(null);
            }}
          >
            ล้างตัวกรอง
          </Button>
        </Stack>
      </Stack>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>วันที่</TableCell>
              <TableCell>ประเภท</TableCell>
              <TableCell>รหัสสินค้า</TableCell>
              <TableCell>ชื่อสินค้า</TableCell>
              <TableCell align="right">จำนวน</TableCell>
              <TableCell>ล็อต</TableCell>
              <TableCell>อ้างอิง</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Box sx={{ p: 2, color: "text.secondary" }}>
                    {loading ? "กำลังโหลด..." : "ไม่พบข้อมูล"}
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              items.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{new Date(m.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{TYPE_LABEL[m.type] || m.type}</TableCell>
                  <TableCell>{m.product?.productCode || "-"}</TableCell>
                  <TableCell>{m.product?.nameTH || "-"}</TableCell>
                  <TableCell align="right">{Number(m.qty || 0).toLocaleString()}</TableCell>
                  <TableCell>{m.stock?.lotNumber || "-"}</TableCell>
                  <TableCell>{m.saleOrder?.soNumber || "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
