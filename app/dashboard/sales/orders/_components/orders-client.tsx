"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import Link from "next/link";
import AddIcon from "@mui/icons-material/Add";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import thLocale from "dayjs/locale/th";
import { CreateOrderDialog, type Option, type ProductOption } from "./create-order-dialog";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/permissions";

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
  productOptions: ProductOption[];
};

export function OrdersClient({ customerOptions, employeeOptions, productOptions }: Props) {
  const { data: session } = useSession();
  const [items, setItems] = useState<OrderItem[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | { type: "cancel" | "delete"; order: OrderItem }>(null);

  const canCreate = hasPermission(session?.user?.permissions, "sales", "create");
  const canView = hasPermission(session?.user?.permissions, "sales", "view");
  const canCancel = hasPermission(session?.user?.permissions, "sales", "reject");
  const canDelete = hasPermission(session?.user?.permissions, "sales", "delete");

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

  const doCancel = async (order: OrderItem) => {
    setBusyId(order.id);
    try {
      const res = await fetch(`/api/sales/orders/${order.id}/cancel`, { method: "POST" });
      if (!res.ok) throw new Error("ยกเลิกไม่สำเร็จ");
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const doDelete = async (order: OrderItem) => {
    setBusyId(order.id);
    try {
      const res = await fetch(`/api/sales/orders/${order.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("ลบไม่สำเร็จ");
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} spacing={1}>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {chips.map((c) => (
            <Chip key={c.value} label={c.label} color={statusFilter === c.value ? "primary" : "default"} onClick={() => setStatusFilter(c.value)} />
          ))}
        </Stack>
        {canCreate && (
          <Button startIcon={<AddIcon />} variant="contained" onClick={() => setOpen(true)} sx={{ width: { xs: "100%", sm: "auto" } }}>
            สร้างใบสั่งขาย
          </Button>
        )}
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
              <TableCell align="right">การทำงาน</TableCell>
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
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      {canView && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          startIcon={<VisibilityOutlinedIcon fontSize="small" />}
                          component={Link as any}
                          href={`/dashboard/sales/orders/${o.id}`}
                        >
                          ดู
                        </Button>
                      )}
                      {canCancel && (
                        <Button
                         size="small"
                         variant="outlined"
                         color="warning"
                         startIcon={<CancelOutlinedIcon fontSize="small" />}
                         disabled={o.status === "CANCELLED" || busyId === o.id}
                         onClick={() => setConfirm({ type: "cancel", order: o })}
                         >
                           ยกเลิก
                         </Button>
                      )}
                      {canDelete && (
                        <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteOutlineIcon fontSize="small" />}
                        disabled={busyId === o.id}
                        onClick={() => setConfirm({ type: "delete", order: o })}
                        >
                          ลบ
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
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
        productOptions={productOptions}
        onCreated={() => load()}
      />

      <Dialog open={Boolean(confirm)} onClose={() => setConfirm(null)}>
        <DialogTitle>{confirm?.type === "delete" ? "ยืนยันการลบ" : "ยืนยันการยกเลิก"}</DialogTitle>
        <DialogContent>
          <Typography>
            {confirm?.type === "delete"
              ? `คุณต้องการลบใบสั่งขายเลขที่ ${confirm?.order.soNumber} ใช่หรือไม่?`
              : `คุณต้องการยกเลิกใบสั่งขายเลขที่ ${confirm?.order.soNumber} ใช่หรือไม่?`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)} color="inherit">ปิด</Button>
          <Button
            onClick={async () => {
              if (!confirm) return;
              const { type, order } = confirm;
              setConfirm(null);
              if (type === "delete") await doDelete(order);
              else await doCancel(order);
            }}
            variant="contained"
            color={confirm?.type === "delete" ? "error" : "warning"}
          >
            ยืนยัน
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
