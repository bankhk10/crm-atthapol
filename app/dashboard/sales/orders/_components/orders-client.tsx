"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import Link from "next/link";
import AddIcon from "@mui/icons-material/Add";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import thLocale from "dayjs/locale/th";
import { CreateOrderDialog, type Option, type ProductOption } from "./create-order-dialog";
import { EditOrderDialog } from "./edit-order-dialog";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/permissions";
import { th } from "date-fns/locale";

dayjs.extend(relativeTime);
dayjs.locale(thLocale);

type OrderItem = {
  id: string;
  soNumber: string;
  orderDate: string;
  shippingDate?: string | null;
  grandTotal: number;
  status: string;
  paymentCondition?: string;
  paymentStatus: string;
  customer?: { id: string; name?: string; companyName?: string; prefix?: string; firstName?: string; lastName?: string } | null;
  salesperson?: { id: string; firstName?: string | null; lastName?: string | null; prefix?: string | null; user?: { name?: string | null; email?: string | null } | null } | null;
};

// UI workflow status options (same set as create/edit)
const WORKFLOW_STATUS_OPTIONS = [
  { value: "ALL", label: "ทั้งหมด" },
  { value: "DRAFT", label: "ร่าง" },
  { value: "PENDING_APPROVAL", label: "รออนุมัติ" },
  { value: "APPROVED", label: "อนุมัติ" },
  { value: "REJECTED", label: "ปฏิเสธ" },
  { value: "AWAITING_STOCK", label: "รอสินค้า" },
  { value: "READY_TO_SHIP", label: "รอจัดส่ง" },
  { value: "IN_TRANSIT", label: "อยู่ระหว่างจัดส่ง" },
  { value: "COMPLETED", label: "สำเร็จ" },
  { value: "CANCELLED", label: "ยกเลิก" },
];

function workflowFromBackend(status: string, paymentStatus: string): string {
  if (status === "DRAFT") return "DRAFT";
  if (status === "CANCELLED") return "CANCELLED"; // could also represent REJECTED
  if (status === "INVOICED") return "READY_TO_SHIP"; // move payment-related labels to payment status
  if (status === "SHIPPED") return paymentStatus === "PAID" ? "COMPLETED" : "IN_TRANSIT";
  if (status === "APPROVED") return "APPROVED"; // or READY_TO_SHIP
  if (status === "CONFIRMED") return "PENDING_APPROVAL"; // or AWAITING_STOCK
  return status || "DRAFT";
}

// Server now supports workflow filter directly via `workflow` query param

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
  const [shippingFrom, setShippingFrom] = useState<string | null>(null);
  const [shippingTo, setShippingTo] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<string>("ALL");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | { type: "cancel" | "delete"; order: OrderItem }>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const canCreate = hasPermission(session?.user?.permissions, "sales", "create");
  const canView = hasPermission(session?.user?.permissions, "sales", "view");
  const canCancel = hasPermission(session?.user?.permissions, "sales", "reject");
  const canDelete = hasPermission(session?.user?.permissions, "sales", "delete");
  const canEdit = hasPermission(session?.user?.permissions, "sales", "edit");

  const chips = useMemo(() => WORKFLOW_STATUS_OPTIONS, []);
  const paymentChips = useMemo(
    () => [
      { value: "ALL", label: "ทั้งหมด" },
      { value: "UNPAID", label: "ยังไม่ชำระ" },
      { value: "PARTIAL", label: "บางส่วน" },
      { value: "PAID", label: "ชำระแล้ว" },
      { value: "OVERDUE", label: "เกินกำหนด" },
    ],
    [],
  );

  const PAYMENT_STATUS_LABEL: Record<string, string> = useMemo(
    () => ({ UNPAID: "ยังไม่ชำระ", PARTIAL: "บางส่วน", PAID: "ชำระแล้ว", OVERDUE: "เกินกำหนด" }),
    [],
  );

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("pageSize", "20");
      if (statusFilter !== "ALL") params.set("workflow", statusFilter);
      if (paymentFilter !== "ALL") params.set("paymentStatus", paymentFilter);
      if (shippingFrom) params.set("shippingDateFrom", new Date(shippingFrom).toISOString());
      if (shippingTo) params.set("shippingDateTo", new Date(shippingTo).toISOString());
      const res = await fetch(`/api/sales/orders?${params.toString()}`);
      const data = await res.json();
      const list: OrderItem[] = data.items || [];
      setItems(list);
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
  }, [statusFilter, paymentFilter, shippingFrom, shippingTo]);

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
      <Stack spacing={1}>
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
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {paymentChips.map((c) => (
            <Chip key={c.value} label={`ชำระเงิน: ${c.label}`} color={paymentFilter === c.value ? "secondary" : "default"} onClick={() => setPaymentFilter(c.value)} />
          ))}
        </Stack>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={th}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
            <DatePicker
              label="จัดส่งตั้งแต่"
              value={shippingFrom ? new Date(shippingFrom) : null}
              onChange={(v) => setShippingFrom(v ? v.toISOString().slice(0, 10) : null)}
              slotProps={{ textField: { fullWidth: true, size: "small" } }}
              views={['year', 'month', 'day']}
            />
            <DatePicker
              label="ถึง"
              value={shippingTo ? new Date(shippingTo) : null}
              onChange={(v) => setShippingTo(v ? v.toISOString().slice(0, 10) : null)}
              slotProps={{ textField: { fullWidth: true, size: "small" } }}
            />
            <Button onClick={() => { setShippingFrom(null); setShippingTo(null); }} color="inherit" sx={{ whiteSpace: 'nowrap' }}>ล้างช่วงวันที่</Button>
          </Stack>
        </LocalizationProvider>
      </Stack>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>เลขที่ SO</TableCell>
              <TableCell>วันที่</TableCell>
              <TableCell>วันที่จัดส่ง</TableCell>
              <TableCell>ลูกค้า</TableCell>
              <TableCell>พนักงานขาย</TableCell>
              <TableCell align="right">ยอดรวม</TableCell>
              <TableCell>สถานะ</TableCell>
              <TableCell>เงื่อนไขชำระ</TableCell>
              <TableCell>ชำระเงิน</TableCell>
              <TableCell align="right">การทำงาน</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9}>
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
                  <TableCell>{o.shippingDate ? dayjs(o.shippingDate).format("DD/MM/YYYY") : "-"}</TableCell>
                  <TableCell>{displayCustomerName(o.customer)}</TableCell>
                  <TableCell>{o.salesperson ? displayEmployeeName(o.salesperson as any) : "-"}</TableCell>
                  <TableCell align="right">{o.grandTotal?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell>{WORKFLOW_STATUS_OPTIONS.find((x) => x.value === workflowFromBackend(o.status, o.paymentStatus))?.label || o.status}</TableCell>
                  <TableCell>{o.paymentCondition === 'POSTPAID' ? 'ส่งก่อน-โอนทีหลัง' : 'โอนก่อน-ส่งทีหลัง'}</TableCell>
                  <TableCell>{PAYMENT_STATUS_LABEL[o.paymentStatus] || o.paymentStatus}</TableCell>
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
                      {canEdit && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="secondary"
                          disabled={workflowFromBackend(o.status, o.paymentStatus) === "COMPLETED"}
                          onClick={() => {
                            if (workflowFromBackend(o.status, o.paymentStatus) === "COMPLETED") return;
                            setEditId(o.id);
                          }}
                        >
                          แก้ไข
                        </Button>
                      )}
                      {canView && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="info"
                          startIcon={<HistoryOutlinedIcon fontSize="small" />}
                          component={Link as any}
                          href={`/dashboard/reports/stock-movements?saleOrderId=${o.id}`}
                        >
                          ดูประวัติ
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

      <EditOrderDialog
        open={editId !== null}
        orderId={editId || ""}
        onClose={() => setEditId(null)}
        customerOptions={customerOptions}
        employeeOptions={employeeOptions}
        productOptions={productOptions}
        onUpdated={() => load()}
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
