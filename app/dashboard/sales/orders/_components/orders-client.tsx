"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, Button, Chip, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import thLocale from "dayjs/locale/th";
import { CreateOrderDialog, type Option } from "./create-order-dialog";

dayjs.extend(relativeTime);
dayjs.locale(thLocale);

type OrderItem = {
  id: string;
  soNumber: string;
  orderDate: string;
  grandTotal: number;
  status: string;
  paymentStatus: string;
  customer?: { id: string; name?: string; companyName?: string; prefix?: string; firstName?: string; lastName?: string } | null;
  salesperson?: { id: string; firstName?: string | null; lastName?: string | null; prefix?: string | null; user?: { name?: string | null; email?: string | null } | null } | null;
};

function displayCustomerName(c: OrderItem["customer"]) {
  if (!c) return "-";
  const name = (c as any).name as string | undefined;
  if (name && name.trim().length > 0) return name;
  const company = (c as any).companyName as string | undefined;
  if (company && company.trim().length > 0) return company;
  const parts = [(c as any).prefix, (c as any).firstName, (c as any).lastName].filter(Boolean);
  return parts.length ? parts.join(" ") : c.id;
}

function displayEmployeeName(e: NonNullable<OrderItem["salesperson"]>) {
  if (!e) return "-";
  const parts = [e.prefix ?? "", e.firstName ?? "", e.lastName ?? ""].filter(Boolean);
  if (parts.length) return parts.join(" ");
  const u = e.user as any;
  return u?.name || u?.email || e.id || "-";
}

type Props = {
  customerOptions: Option[];
  employeeOptions: Option[];
};

export function OrdersClient({ customerOptions, employeeOptions }: Props) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const chips = useMemo(
    () => [
      { value: "ALL", label: "ทั้งหมด" },
      { value: "DRAFT", label: "ฉบับร่าง" },
      { value: "CONFIRMED", label: "ยืนยันแล้ว" },
      { value: "APPROVED", label: "อนุมัติ" },
      { value: "SHIPPED", label: "จัดส่งแล้ว" },
      { value: "INVOICED", label: "ออกบิลแล้ว" },
      { value: "CANCELLED", label: "ยกเลิก" },
    ],
    [],
  );

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("pageSize", "20");
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const res = await fetch(`/api/sales/orders?${params.toString()}`);
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (_) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} spacing={1}>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {chips.map((c) => (
            <Chip key={c.value} label={c.label} color={statusFilter === c.value ? "primary" : "default"} onClick={() => setStatusFilter(c.value)} />
          ))}
        </Stack>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => setOpen(true)} sx={{ width: { xs: "100%", sm: "auto" } }}>
          สร้างใบสั่งขาย
        </Button>
      </Stack>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>เลขที่ SO</TableCell>
              <TableCell>วันที่</TableCell>
              <TableCell>ลูกค้า</TableCell>
              <TableCell>พนักงานขาย</TableCell>
              <TableCell align="right">ยอดรวม</TableCell>
              <TableCell>สถานะ</TableCell>
              <TableCell>ชำระเงิน</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Box py={4} textAlign="center">
                    <Typography color="text.secondary">{loading ? "กำลังโหลด..." : "ยังไม่มีรายการ"}</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              items.map((o) => (
                <TableRow key={o.id} hover>
                  <TableCell>{o.soNumber}</TableCell>
                  <TableCell>{dayjs(o.orderDate).format("DD/MM/YYYY")}</TableCell>
                  <TableCell>{displayCustomerName(o.customer)}</TableCell>
                  <TableCell>{o.salesperson ? displayEmployeeName(o.salesperson as any) : "-"}</TableCell>
                  <TableCell align="right">{o.grandTotal?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell>{o.status}</TableCell>
                  <TableCell>{o.paymentStatus}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <CreateOrderDialog
        open={open}
        onClose={() => setOpen(false)}
        customerOptions={customerOptions}
        employeeOptions={employeeOptions}
        onCreated={() => load()}
      />
    </Stack>
  );
}

