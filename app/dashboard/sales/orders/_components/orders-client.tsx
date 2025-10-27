"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Tooltip,
  TableSortLabel,
  TablePagination,
  IconButton,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DoneOutlinedIcon from "@mui/icons-material/DoneOutlined";
import ThumbDownOutlinedIcon from "@mui/icons-material/ThumbDownOutlined";
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
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

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
  customer?: {
    id: string;
    name?: string;
    companyName?: string;
    prefix?: string;
    firstName?: string;
    lastName?: string;
  } | null;
  salesperson?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    prefix?: string | null;
    user?: { name?: string | null; email?: string | null } | null;
  } | null;
};

type Order = "asc" | "desc";
type SortableKeys =
  | "soNumber"
  | "orderDate"
  | "shippingDate"
  | "customerName"
  // | "salespersonName"
  | "grandTotal"
  | "status"
  | "paymentCondition"
  | "paymentStatus";

const visuallyHidden = {
  border: 0,
  clip: "rect(0 0 0 0)",
  height: 1,
  margin: -1,
  overflow: "hidden",
  padding: 0,
  position: "absolute" as const,
  width: 1,
  whiteSpace: "nowrap" as const,
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
  const [confirm, setConfirm] = useState<null | { type: "cancel" | "delete"; order: OrderItem }>(
    null,
  );
  const [editId, setEditId] = useState<string | null>(null);

  // Sorting & Pagination (match products table UX)
  const [order, setOrder] = useState<Order>("asc");
  const [orderBy, setOrderBy] = useState<SortableKeys>("orderDate");
  const [page, setPage] = useState(0); // 0-based for TablePagination
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const canCreate = hasPermission(session?.user?.permissions, "sales", "create");
  const canView = hasPermission(session?.user?.permissions, "sales", "view");
  const canCancel = hasPermission(session?.user?.permissions, "sales", "reject");
  const canDelete = hasPermission(session?.user?.permissions, "sales", "delete");
  const canEdit = hasPermission(session?.user?.permissions, "sales", "edit");
  const canApprove = hasPermission(session?.user?.permissions, "sales", "approve");

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
      params.set("page", String(page + 1));
      params.set("pageSize", String(rowsPerPage));
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
  }, [statusFilter, paymentFilter, shippingFrom, shippingTo, page, rowsPerPage]);

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

  const doApprove = async (order: OrderItem) => {
    setBusyId(order.id);
    try {
      const res = await fetch(`/api/sales/orders/${order.id}/approve`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "อนุมัติไม่สำเร็จ");
      }
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const doReject = async (order: OrderItem) => {
    setBusyId(order.id);
    try {
      const reason = window.prompt("กรุณาระบุเหตุผลการปฏิเสธ", "");
      const payload = reason && reason.trim().length > 0 ? { reason: reason.trim() } : undefined;
      const res = await fetch(`/api/sales/orders/${order.id}/reject`, {
        method: "POST",
        headers: payload ? { "Content-Type": "application/json" } : undefined,
        body: payload ? JSON.stringify(payload) : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "ปฏิเสธไม่สำเร็จ");
      }
      await load();
    } finally {
      setBusyId(null);
    }
  };

function workflowChipSx(wf: string) {
  if (wf === "COMPLETED") return { color: "#fff", bgcolor: "#22C55E" } as const;
  if (wf === "CANCELLED" || wf === "REJECTED") return { color: "#fff", bgcolor: "#EF4444" } as const;
  if (wf === "IN_TRANSIT" || wf === "READY_TO_SHIP" || wf === "AWAITING_STOCK")
    return { color: "#000", bgcolor: "#FACC15" } as const;
  return { color: "#424242", bgcolor: "#E0E0E0" } as const;
}

  // Client-side sorting (current page only)
  function descendingComparator(a: OrderItem, b: OrderItem, key: SortableKeys) {
    const mapVal = (o: OrderItem, k: SortableKeys) => {
      switch (k) {
        case "customerName":
          return (displayCustomerName(o.customer) || "").toString().toLowerCase();
        // case "salespersonName":
        //   return (o.salesperson ? displayEmployeeName(o.salesperson as any) : "").toString().toLowerCase();
        case "grandTotal":
          return Number(o.grandTotal ?? 0);
        case "orderDate":
          return o.orderDate ? new Date(o.orderDate).getTime() : 0;
        case "shippingDate":
          return o.shippingDate ? new Date(o.shippingDate).getTime() : 0;
        default:
          return ((o as any)[k] ?? "").toString().toLowerCase();
      }
    };
    const av = mapVal(a, key);
    const bv = mapVal(b, key);
    if (typeof av === "number" && typeof bv === "number") return (bv as number) - (av as number);
    if (bv < av) return -1;
    if (bv > av) return 1;
    return 0;
  }
  const sortedItems = useMemo(() => {
    const arr = [...items];
    const comp = (a: OrderItem, b: OrderItem) =>
      order === "asc" ? descendingComparator(a, b, orderBy) : -descendingComparator(a, b, orderBy);
    return arr.sort(comp);
  }, [items, order, orderBy]);

  const headCells: {
    id: SortableKeys;
    label: string;
    width?: number;
    align?: "left" | "center" | "right";
  }[] = [
    { id: "soNumber", label: "เลขที่ SO", width: 150 },
    { id: "orderDate", label: "วันที่", width: 90 },
    { id: "shippingDate", label: "วันที่จัดส่ง", width: 90 },
    { id: "customerName", label: "ลูกค้า", width: 150 },
    // { id: "salespersonName", label: "พนักงานขาย", width: 200 },
    { id: "grandTotal", label: "ยอดรวม", width: 100, align: "right" },
    { id: "status", label: "สถานะ", width: 100 },
    { id: "paymentCondition", label: "เงื่อนไขชำระ", width: 140 },
    { id: "paymentStatus", label: "ชำระเงิน", width: 120 },
  ];

  function EnhancedTableHead({
    order,
    orderBy,
    onRequestSort,
    showActions,
  }: {
    order: Order;
    orderBy: SortableKeys;
    onRequestSort: (e: React.MouseEvent<unknown>, p: SortableKeys) => void;
    showActions: boolean;
  }) {
    const createSortHandler = (property: SortableKeys) => (event: React.MouseEvent<unknown>) => {
      onRequestSort(event, property);
    };
    return (
      <TableHead
        sx={{
          bgcolor: "#ccccceff",
          "& .MuiTableCell-root": {
            bgcolor: "#ccccceff",
            color: "#1a1919ff",
            fontFamily: "Prompt, sans-serif",
            fontSize: "1rem",
            fontWeight: 800,
            borderBottom: "none",
            whiteSpace: "nowrap",
          },
        }}
      >
        <TableRow>
          {headCells.map((h) => (
            <TableCell
              key={h.id}
              align={h.align ?? (h.id === "grandTotal" ? "right" : "left")}
              sx={{ width: h.width }}
            >
              <Tooltip title={`เรียงตาม ${h.label}`} arrow>
                <TableSortLabel
                  active={orderBy === h.id}
                  direction={orderBy === h.id ? order : "asc"}
                  sx={{
                    color: "inherit !important",
                    "& .MuiTableSortLabel-icon": { color: "#fff !important" },
                  }}
                  onClick={createSortHandler(h.id)}
                >
                  {h.label}
                  {orderBy === h.id && (
                    <Box component="span" sx={visuallyHidden}>
                      {order === "desc" ? "sorted descending" : "sorted ascending"}
                    </Box>
                  )}
                </TableSortLabel>
              </Tooltip>
            </TableCell>
          ))}
          {showActions && (
            <TableCell align="center" sx={{ width: 180 }}>
              <Tooltip title="การกระทำ" arrow>
                <span>การกระทำ</span>
              </Tooltip>
            </TableCell>
          )}
        </TableRow>
      </TableHead>
    );
  }

  const handleRequestSort = (_: React.MouseEvent<unknown>, property: SortableKeys) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  return (
    <Stack spacing={2}>
      <Stack spacing={1}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
          spacing={1}
        >
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {chips.map((c) => (
              <Chip
                key={c.value}
                label={c.label}
                color={statusFilter === c.value ? "primary" : "default"}
                onClick={() => setStatusFilter(c.value)}
              />
            ))}
          </Stack>
          {canCreate && (
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              onClick={() => setOpen(true)}
              sx={{ width: { xs: "100%", sm: "auto" } }}
            >
              สร้างใบสั่งขาย
            </Button>
          )}
        </Stack>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {paymentChips.map((c) => (
            <Chip
              key={c.value}
              label={`ชำระเงิน: ${c.label}`}
              color={paymentFilter === c.value ? "secondary" : "default"}
              onClick={() => setPaymentFilter(c.value)}
            />
          ))}
        </Stack>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={th}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            alignItems={{ xs: "stretch", sm: "center" }}
          >
            <DatePicker
              label="จัดส่งตั้งแต่"
              value={shippingFrom ? new Date(shippingFrom) : null}
              onChange={(v) => setShippingFrom(v ? v.toISOString().slice(0, 10) : null)}
              slotProps={{ textField: { fullWidth: true, size: "small" } }}
              views={["year", "month", "day"]}
            />
            <DatePicker
              label="ถึง"
              value={shippingTo ? new Date(shippingTo) : null}
              views={["year", "month", "day"]}
              onChange={(v) => setShippingTo(v ? v.toISOString().slice(0, 10) : null)}
              slotProps={{ textField: { fullWidth: true, size: "small" } }}
            />
            <Button
              onClick={() => {
                setShippingFrom(null);
                setShippingTo(null);
              }}
              color="inherit"
              sx={{ whiteSpace: "nowrap" }}
            >
              ล้างช่วงวันที่
            </Button>
          </Stack>
        </LocalizationProvider>
      </Stack>

      {/* Mobile cards layout */}
      <Stack spacing={1.25} sx={{ p: 1.5, display: { xs: "block", md: "none" } }}>
        {sortedItems.map((o) => {
          const rawWf = workflowFromBackend(o.status, o.paymentStatus);
          const wf = o.status === "CANCELLED" && (o as any)?.rejectReason ? "REJECTED" : rawWf;
          const isTerminal = wf === "COMPLETED" || wf === "CANCELLED";
          const wfLabel = WORKFLOW_STATUS_OPTIONS.find((x) => x.value === wf)?.label || o.status;
          return (
            <Paper key={o.id} variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography fontWeight={700}>SO {o.soNumber}</Typography>
                  <Chip
                    size="small"
                    label={wfLabel}
                    sx={{ fontWeight: 600, px: 1.2, borderRadius: "9999px", ...workflowChipSx(wf) }}
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  ลูกค้า: {displayCustomerName(o.customer)}
                </Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  <Chip size="small" label={`วันที่: ${dayjs(o.orderDate).format("DD/MM/YYYY")}`} />
                  <Chip
                    size="small"
                    label={`จัดส่ง: ${o.shippingDate ? dayjs(o.shippingDate).format("DD/MM/YYYY") : "-"}`}
                  />
                  <Chip
                    size="small"
                    label={`ยอดรวม: ${o.grandTotal?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  />
                  <Chip
                    size="small"
                    label={`ชำระ: ${PAYMENT_STATUS_LABEL[o.paymentStatus] || o.paymentStatus}`}
                  />
                </Stack>
                {(canView || canEdit || canCancel || canDelete || canApprove) && (
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    {canView && (
                      <Tooltip title="ดูรายละเอียด" arrow>
                        <IconButton
                          component={Link as any}
                          href={`/dashboard/sales/orders/${o.id}`}
                          size="small"
                        >
                          <VisibilityOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {canApprove && (o.status === "CONFIRMED" || o.status === "DRAFT") && (
                      <Tooltip title="อนุมัติ" arrow>
                        <span>
                          <IconButton
                            size="small"
                            color="success"
                            disabled={busyId === o.id}
                            onClick={() => doApprove(o)}
                          >
                            <DoneOutlinedIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                    {canCancel && (o.status === "CONFIRMED" || o.status === "DRAFT") && (
                      <Tooltip title="ปฏิเสธ" arrow>
                        <span>
                          <IconButton
                            size="small"
                            color="warning"
                            disabled={busyId === o.id}
                            onClick={() => doReject(o)}
                          >
                            <ThumbDownOutlinedIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                    {!isTerminal && canEdit && (
                      <Tooltip
                        title={wf === "COMPLETED" ? "แก้ไขไม่ได้ (เสร็จสิ้น)" : "แก้ไข"}
                        arrow
                      >
                        <span>
                          <IconButton
                            size="small"
                            disabled={wf === "COMPLETED"}
                            onClick={() => setEditId(o.id)}
                          >
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                    {!isTerminal && canCancel && (
                      <Tooltip title={o.status === "CANCELLED" ? "ถูกยกเลิกแล้ว" : "ยกเลิก"} arrow>
                        <span>
                          <IconButton
                            size="small"
                            disabled={o.status === "CANCELLED" || busyId === o.id}
                            onClick={() => setConfirm({ type: "cancel", order: o })}
                          >
                            <CancelOutlinedIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                    {!isTerminal && canDelete && (
                      <Tooltip title="ลบ" arrow>
                        <span>
                          <IconButton
                            size="small"
                            disabled={busyId === o.id}
                            onClick={() => setConfirm({ type: "delete", order: o })}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                  </Stack>
                )}
              </Stack>
            </Paper>
          );
        })}
        {sortedItems.length === 0 && (
          <Typography color="text.secondary" align="center">
            {loading ? "กำลังโหลด..." : "ยังไม่มีรายการ"}
          </Typography>
        )}
      </Stack>

      <TableContainer
        component={Paper}
        sx={{
          display: { xs: "none", md: "block" },
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          "&::-webkit-scrollbar": { width: 8 },
          "&::-webkit-scrollbar-thumb": { backgroundColor: "#ccc", borderRadius: 6 },
        }}
      >
        <Table aria-labelledby="ordersTableTitle" sx={{ minWidth: 900, tableLayout: "fixed" }}>
          <EnhancedTableHead
            order={order}
            orderBy={orderBy}
            onRequestSort={handleRequestSort}
            showActions={canView || canEdit || canCancel || canDelete}
          />
          <TableBody>
            {sortedItems.map((o, idx) => {
              const wf = workflowFromBackend(o.status, o.paymentStatus);
              const isTerminal = wf === "COMPLETED" || wf === "CANCELLED";
              return (
              <TableRow
                key={o.id}
                hover
                sx={{
                  "&:nth-of-type(even)": { bgcolor: "#fafafa" },
                  "&:hover": { bgcolor: "#f0f0f0" },
                }}
              >
                <TableCell
                  sx={{
                    width: 120,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  <Tooltip title={o.soNumber} arrow>
                    <span>{o.soNumber}</span>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ width: 110 }}>
                  <Tooltip title={dayjs(o.orderDate).format("DD/MM/YYYY")} arrow>
                    <span>{dayjs(o.orderDate).format("DD/MM/YYYY")}</span>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ width: 120 }}>
                  <Tooltip
                    title={o.shippingDate ? dayjs(o.shippingDate).format("DD/MM/YYYY") : "-"}
                    arrow
                  >
                    <span>{o.shippingDate ? dayjs(o.shippingDate).format("DD/MM/YYYY") : "-"}</span>
                  </Tooltip>
                </TableCell>
                <TableCell
                  sx={{
                    width: 220,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  <Tooltip title={displayCustomerName(o.customer)} arrow>
                    <span>{displayCustomerName(o.customer)}</span>
                  </Tooltip>
                </TableCell>
                {/* <TableCell sx={{ width: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  <Tooltip title={o.salesperson ? displayEmployeeName(o.salesperson as any) : "-"} arrow>
                    <span>{o.salesperson ? displayEmployeeName(o.salesperson as any) : "-"}</span>
                  </Tooltip>
                </TableCell> */}
                <TableCell align="right" sx={{ width: 120 }}>
                  <Tooltip
                    title={o.grandTotal?.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                    arrow
                  >
                    <span>
                      {o.grandTotal?.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ width: 120 }}>
                  <Tooltip
                    title={
                      WORKFLOW_STATUS_OPTIONS.find(
                        (x) => x.value === workflowFromBackend(o.status, o.paymentStatus),
                      )?.label || o.status
                    }
                    arrow
                  >
                    <span>
                      {WORKFLOW_STATUS_OPTIONS.find(
                        (x) => x.value === workflowFromBackend(o.status, o.paymentStatus),
                      )?.label || o.status}
                    </span>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ width: 140 }}>
                  <Tooltip
                    title={
                      o.paymentCondition === "POSTPAID" ? "ส่งก่อน-โอนทีหลัง" : "โอนก่อน-ส่งทีหลัง"
                    }
                    arrow
                  >
                    <span>
                      {o.paymentCondition === "POSTPAID"
                        ? "ส่งก่อน-โอนทีหลัง"
                        : "โอนก่อน-ส่งทีหลัง"}
                    </span>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ width: 120 }}>
                  <Tooltip title={PAYMENT_STATUS_LABEL[o.paymentStatus] || o.paymentStatus} arrow>
                    <span>{PAYMENT_STATUS_LABEL[o.paymentStatus] || o.paymentStatus}</span>
                  </Tooltip>
                </TableCell>
                {(canView || canEdit || canCancel || canDelete || canApprove) && (
                  <TableCell align="center" sx={{ width: 180, px: 2 }}>
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      {canView && (
                        <Tooltip title="ดูรายละเอียด" arrow>
                          <IconButton
                            component={Link as any}
                            href={`/dashboard/sales/orders/${o.id}`}
                            size="small"
                            color="primary"
                          >
                            <VisibilityOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {canApprove && (o.status === "CONFIRMED" || o.status === "DRAFT") && (
                        <Tooltip title="อนุมัติ" arrow>
                          <span>
                            <IconButton
                              size="small"
                              color="success"
                              disabled={busyId === o.id}
                              onClick={() => doApprove(o)}
                            >
                              <DoneOutlinedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                      {canCancel && (o.status === "CONFIRMED" || o.status === "DRAFT") && (
                        <Tooltip title="ปฏิเสธ" arrow>
                          <span>
                            <IconButton
                              size="small"
                              color="warning"
                              disabled={busyId === o.id}
                              onClick={() => doReject(o)}
                            >
                              <ThumbDownOutlinedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                      {!isTerminal && canEdit && (
                        <Tooltip
                          title={
                            workflowFromBackend(o.status, o.paymentStatus) === "COMPLETED"
                              ? "แก้ไขไม่ได้ (เสร็จสิ้น)"
                              : "แก้ไข"
                          }
                          arrow
                        >
                          <span>
                            <IconButton
                              size="small"
                              color="secondary"
                              disabled={
                                workflowFromBackend(o.status, o.paymentStatus) === "COMPLETED"
                              }
                              onClick={() => setEditId(o.id)}
                            >
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                      {!isTerminal && canCancel && (
                        <Tooltip
                          title={o.status === "CANCELLED" ? "ถูกยกเลิกแล้ว" : "ยกเลิก"}
                          arrow
                        >
                          <span>
                            <IconButton
                              size="small"
                              color="warning"
                              disabled={o.status === "CANCELLED" || busyId === o.id}
                              onClick={() => setConfirm({ type: "cancel", order: o })}
                            >
                              <CancelOutlinedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                      {!isTerminal && canDelete && (
                        <Tooltip title="ลบ" arrow>
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={busyId === o.id}
                              onClick={() => setConfirm({ type: "delete", order: o })}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                )}
              </TableRow>
            );})}
            {sortedItems.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={
                    headCells.length + (canView || canEdit || canCancel || canDelete ? 1 : 0)
                  }
                >
                  <Box py={4} textAlign="center">
                    <Typography color="text.secondary">
                      {loading ? "กำลังโหลด..." : "ยังไม่มีรายการ"}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 20, 50]}
        component="div"
        count={total}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
      />

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
          <Button onClick={() => setConfirm(null)} color="inherit">
            ปิด
          </Button>
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
