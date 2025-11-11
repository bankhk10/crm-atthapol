"use client";

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
  TableSortLabel,
  TablePagination,
  TextField,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Typography,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/permissions";
import { Snackbar } from "@mui/material";
import { EmptyTableMessage } from "@/components/ui/EmptyTableMessage";
import { formatNumber } from "@/lib/format";
import { CreditLimitEditDialog } from "./credit-limit-edit-dialog";
import IconButton from "@mui/material/IconButton";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import FirstPageIcon from "@mui/icons-material/FirstPage";
import KeyboardArrowLeft from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRight from "@mui/icons-material/KeyboardArrowRight";
import LastPageIcon from "@mui/icons-material/LastPage";

export function CreditLimitsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0); // 0-based for TablePagination
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [showSaved, setShowSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const { data: session } = useSession();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const canApprove = hasPermission(session?.user?.permissions, "customers", "approve");
  const canReject = hasPermission(session?.user?.permissions, "customers", "reject") || canApprove;
  const canEditLimits = hasPermission(session?.user?.permissions, "customers", "edit");

  const pageSize = rowsPerPage;

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      // convert to 1-based page for API
      params.set("page", String(page + 1));
      params.set("pageSize", String(pageSize));
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/credit-requests?${params.toString()}`);
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      // ignore for now
    } finally {
      setLoading(false);
    }
  };

  // Initialize from URL search params on mount
  useEffect(() => {
    const sp = searchParams;
    const p = Number(sp?.get("page") || "");
    if (Number.isFinite(p) && p > 0) setPage(p - 1);
    const q0 = (sp?.get("q") || "").trim();
    if (q0) {
      setQInput(q0);
      setQ(q0);
    }
    // show saved banner if present
    const saved = sp?.get("saved");
    if (saved) {
      const nxt = new URLSearchParams(sp.toString());
      nxt.delete("saved");
      router.replace(`${pathname}${nxt.toString() ? `?${nxt.toString()}` : ""}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce input -> q
  useEffect(() => {
    const h = setTimeout(() => {
      setPage(0);
      setQ(qInput.trim());
    }, 350);
    return () => clearTimeout(h);
  }, [qInput]);

  // Load when page or q or rowsPerPage changes
  useEffect(() => {
    load();
    // reflect into URL (1-based page)
    const next = new URLSearchParams(searchParams?.toString() || "");
    if (q.trim()) next.set("q", q.trim());
    else next.delete("q");
    next.set("page", String(page + 1));
    next.set("pageSize", String(pageSize));
    router.replace(`${pathname}?${next.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, q, rowsPerPage]);

  // sorting
  type Order = "asc" | "desc";
  type SortKey =
    | "name"
    | "creditLimit"
    | "promotionBudgetLimit"
    | "amount"
    | "expiryDate"
    | "status";
  const [order, setOrder] = useState<Order>("asc");
  const [orderBy, setOrderBy] = useState<SortKey>("name");

  // selection states
  const [selected, setSelected] = useState<any | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);

  const getValue = (row: any, key: SortKey) => {
    const dd = row.customer?.dealerDetail ?? {};
    switch (key) {
      case "name":
        return (row.customer?.companyName || row.customer?.name || "").toString();
      case "creditLimit":
        return dd.creditLimit ?? 0;
      case "promotionBudgetLimit":
        return dd.promotionBudgetLimit ?? 0;
      case "amount":
        return row.amount ?? 0;
      case "expiryDate":
        return row.expiryDate ? new Date(row.expiryDate).getTime() : 0;
      case "status": {
        const exp = row.expiryDate ? new Date(row.expiryDate) : null;
        const isExpired = row.status === "APPROVED" && exp && exp.getTime() < Date.now();
        const display = isExpired ? "EXPIRED" : row.status || "";
        return display;
      }
    }
  };

  const descendingComparator = (a: any, b: any, key: SortKey) => {
    const av = getValue(a, key);
    const bv = getValue(b, key);
    const as = typeof av === "number" ? av : String(av).toLowerCase();
    const bs = typeof bv === "number" ? bv : String(bv).toLowerCase();
    if (bs < as) return -1;
    if (bs > as) return 1;
    return 0;
  };
  const getComparator = (ord: Order, key: SortKey) =>
    ord === "asc"
      ? (a: any, b: any) => descendingComparator(a, b, key)
      : (a: any, b: any) => -descendingComparator(a, b, key);

  interface HeadCell {
    id: SortKey;
    label: string;
    width: number;
    align?: "left" | "right" | "center";
  }

  const headCells: readonly HeadCell[] = [
    { id: "name", label: "ชื่อร้าน", width: 250, align: "left" },
    { id: "creditLimit", label: "วงเงินเครดิต", width: 80, align: "center" },
    { id: "promotionBudgetLimit", label: "วงเงินส่งเสริมกิจกรรม", width: 180, align: "right" },
    { id: "amount", label: "วงเงินเครดิตชั่วคราว", width: 120, align: "right" },
    { id: "expiryDate", label: "วันหมดอายุ", width: 150, align: "right" },
    { id: "status", label: "สถานะ", width: 100, align: "right" },
  ];

  const filteredSorted = useMemo(() => {
    // API already filtered by q and paginated; we sort the current page client-side
    return [...items].sort(getComparator(order, orderBy));
  }, [items, order, orderBy]);

  const handleRequestSort = (_: React.MouseEvent<unknown>, property: SortKey) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  // Modern pagination actions (matching products table)
  const TablePaginationActionsModern = ({
    count,
    page,
    rowsPerPage,
    onPageChange,
  }: {
    count: number;
    page: number;
    rowsPerPage: number;
    onPageChange: (event: React.MouseEvent<HTMLButtonElement>, newPage: number) => void;
  }) => {
    const lastPage = Math.max(0, Math.ceil(count / rowsPerPage) - 1);
    return (
      <Stack direction="row" spacing={0.5} alignItems="center">
        <IconButton
          onClick={(e) => onPageChange(e as any, 0)}
          disabled={page === 0}
          size="small"
          sx={{
            color: "primary.main",
            borderRadius: 2,
            "&:hover": { bgcolor: "primary.main", color: "common.white" },
            transition: "all .15s ease",
          }}
          aria-label="first page"
        >
          <FirstPageIcon fontSize="small" />
        </IconButton>
        <IconButton
          onClick={(e) => onPageChange(e as any, Math.max(0, page - 1))}
          disabled={page === 0}
          size="small"
          sx={{
            color: "primary.main",
            borderRadius: 2,
            "&:hover": { bgcolor: "primary.main", color: "common.white" },
            transition: "all .15s ease",
          }}
          aria-label="previous page"
        >
          <KeyboardArrowLeft fontSize="small" />
        </IconButton>
        <IconButton
          onClick={(e) => onPageChange(e as any, Math.min(lastPage, page + 1))}
          disabled={page >= lastPage}
          size="small"
          sx={{
            color: "primary.main",
            borderRadius: 2,
            "&:hover": { bgcolor: "primary.main", color: "common.white" },
            transition: "all .15s ease",
          }}
          aria-label="next page"
        >
          <KeyboardArrowRight fontSize="small" />
        </IconButton>
        <IconButton
          onClick={(e) => onPageChange(e as any, lastPage)}
          disabled={page >= lastPage}
          size="small"
          sx={{
            color: "primary.main",
            borderRadius: 2,
            "&:hover": { bgcolor: "primary.main", color: "common.white" },
            transition: "all .15s ease",
          }}
          aria-label="last page"
        >
          <LastPageIcon fontSize="small" />
        </IconButton>
      </Stack>
    );
  };

  // state for edit dialog
  const [editCustomer, setEditCustomer] = useState<any | null>(null);

  const renderStatusChip = (row: any) => {
    const base = row.status;
    const exp = row.expiryDate ? new Date(row.expiryDate) : null;
    const isExpired = base === "APPROVED" && exp && exp.getTime() < Date.now();
    const label =
      base === "PENDING"
        ? "รออนุมัติ"
        : base === "APPROVED"
          ? isExpired
            ? "หมดอายุ"
            : "อนุมัติ"
          : base === "REJECTED"
            ? "ปฏิเสธ"
            : base;
    const color: any =
      label === "รออนุมัติ"
        ? "warning"
        : label === "อนุมัติ"
          ? "success"
          : label === "ปฏิเสธ"
            ? "error"
            : "default";
    return (
      <Chip
        component="span"
        label={label}
        color={color}
        size="small"
        sx={{ display: "inline-flex" }}
      />
    );
  };

  // truncate helper (33 characters requested)
  const truncate = (s?: string | null, max = 33) => {
    if (!s) return "-";
    const str = String(s);
    return str.length > max ? `${str.slice(0, max)}...` : str;
  };

  return (
    <>
      {/* Toolbar: search + create button */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        justifyContent="space-between"
        alignItems="center"
        sx={{ px: { sm: 2 }, py: 1 }}
      >
        <Box sx={{ width: { xs: "100%", sm: 260, md: 360 } }}>
          <TextField
            fullWidth
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="ค้นหา (ชื่อร้าน/ผู้ติดต่อ)"
            InputProps={{
              startAdornment: <SearchIcon fontSize="small" style={{ marginRight: 8 }} />,
            }}
            size="small"
          />
        </Box>
        <Stack
          direction="row"
          spacing={1}
          justifyContent="flex-end"
          sx={{ width: { xs: "100%", sm: "auto" } }}
        >
          <Button
            component={Link}
            href="/dashboard/customers/credit-limits/manage-all"
            variant="contained"
            color="primary"
            size="large"
          >
            จัดการวงเงินทั้งหมด
          </Button>
          <Button
            component={Link}
            href="/dashboard/customers/credit-limits/create"
            variant="contained"
            color="primary"
          >
            ขอวงเงินเครดิตชั่วคราว
          </Button>
        </Stack>
      </Stack>

      <Paper
        variant="outlined"
        sx={{
          borderRadius: 2,
          overflow: "hidden",
          borderColor: "#ddd",
          fontFamily: "Prompt, sans-serif",
          mt: 2,
        }}
      >
        <Box sx={{ px: { xs: 1, sm: 0 } }}>
          {/* Desktop / tablet: table. Mobile: stacked list */}
          {!isMobile ? (
            <Box sx={{ overflowX: "auto" }}>
              <TableContainer
                sx={{
                  borderTopLeftRadius: 12,
                  borderTopRightRadius: 12,
                  "&::-webkit-scrollbar": { width: 8 },
                  "&::-webkit-scrollbar-thumb": { backgroundColor: "#ccc", borderRadius: 6 },
                }}
              >
                <Table aria-labelledby="tableTitle" sx={{ minWidth: 900, tableLayout: "fixed" }}>
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
                        <TableCell key={h.id} align={h.align ?? "left"} sx={{ width: h.width }}>
                          <Tooltip title={`เรียงตาม ${h.label}`} arrow>
                            <TableSortLabel
                              active={orderBy === h.id}
                              direction={orderBy === h.id ? order : "asc"}
                              sx={{
                                color: "inherit !important",
                                "& .MuiTableSortLabel-icon": { color: "inherit !important" },
                              }}
                              onClick={(e) => handleRequestSort(e, h.id)}
                            >
                              {h.label}
                            </TableSortLabel>
                          </Tooltip>
                        </TableCell>
                      ))}
                      <TableCell align="center" sx={{ width: 120 }}>
                        การกระทำ
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredSorted.map((req) => {
                      const dd = req.customer?.dealerDetail;
                      const name = req.customer?.companyName || req.customer?.name || "-";
                      const tempAmount = req.amount ? formatNumber(req.amount) : "-";
                      const exp = req.expiryDate ? new Date(req.expiryDate) : null;
                      return (
                        <TableRow
                          key={req.id}
                          hover
                          sx={{
                            "&:nth-of-type(even)": { bgcolor: "#fafafa" },
                            "&:hover": { bgcolor: "#f0f0f0" },
                          }}
                        >
                          <TableCell
                            sx={{
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            <Tooltip title={name} arrow>
                              <Box
                                component="span"
                                sx={{
                                  display: "inline-block",
                                  maxWidth: "100%",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {truncate(name, 33)}
                              </Box>
                            </Tooltip>
                          </TableCell>
                          <TableCell align="center">
                            {dd?.creditLimit != null ? formatNumber(dd.creditLimit) : "-"}
                          </TableCell>
                          <TableCell align="center">
                            {dd?.promotionBudgetLimit != null
                              ? formatNumber(dd.promotionBudgetLimit)
                              : "-"}
                          </TableCell>
                          <TableCell align="right">{tempAmount}</TableCell>
                          <TableCell align="right">
                            {exp ? exp.toLocaleDateString("th-TH") : "-"}
                          </TableCell>
                          <TableCell align="right">{renderStatusChip(req)}</TableCell>
                          <TableCell align="center" sx={{ width: 120 }}>
                            <Stack direction="row" spacing={0} justifyContent="center">
                              <Tooltip title="รายละเอียด" arrow>
                                <IconButton
                                  size="small"
                                  aria-label="รายละเอียด"
                                  onClick={() => setSelected(req)}
                                  sx={{
                                    color: "primary.main",
                                    borderRadius: 2,
                                    "&:hover": { bgcolor: "primary.main", color: "common.white" },
                                    transition: "all .15s ease",
                                  }}
                                >
                                  <VisibilityOutlinedIcon fontSize="inherit" />
                                </IconButton>
                              </Tooltip>
                              {req.status === "PENDING" && (
                                <>
                                  {canApprove && (
                                    // 1. ครอบ IconButton ด้วย Tooltip
                                    // 2. ใส่ "title" ที่ต้องการให้แสดง
                                    <Tooltip title="อนุมัติ">
                                      <IconButton
                                        size="small"
                                        color="success"
                                        aria-label="อนุมัติ" // สำคัญมาก: เพื่อ Accessibility
                                        onClick={async () => {
                                          if (!confirm("ยืนยันอนุมัติคำขอ?")) return;
                                          try {
                                            await fetch(`/api/credit-requests/${req.id}`, {
                                              method: "PUT",
                                              headers: { "Content-Type": "application/json" },
                                              body: JSON.stringify({ action: "approve" }),
                                            });
                                            load();
                                          } catch (err) {
                                            console.error(err);
                                          }
                                        }}
                                      >
                                        <CheckIcon fontSize="inherit" />
                                      </IconButton>
                                    </Tooltip>
                                  )}

                                  {canReject && (
                                    <Tooltip title="ปฏิเสธ">
                                      <IconButton
                                        size="small"
                                        color="error"
                                        aria-label="ปฏิเสธ" // สำคัญมาก: เพื่อ Accessibility
                                        onClick={() => {
                                          setSelected(req);
                                          setRejectOpen(true);
                                        }}
                                      >
                                        <CloseIcon fontSize="inherit" />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                  {/* delete button: approver or requester can delete pending */}
                                  {(canApprove ||
                                    req.requestedBy?.id === session?.user?.id ||
                                    req.requestedByUserId === session?.user?.id) && (
                                    <Tooltip title="ลบ" arrow>
                                      <IconButton
                                        size="small"
                                        color="error"
                                        aria-label="ลบ"
                                        onClick={() => setConfirmDelete(req)}
                                      >
                                        <DeleteOutlineIcon fontSize="inherit" />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                </>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredSorted.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={headCells.length + 1}>
                          <EmptyTableMessage
                            colSpan={headCells.length + 1}
                            message={loading ? "กำลังโหลด..." : "ไม่พบคำขอ"}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : (
            <Stack spacing={1} sx={{ p: 1 }}>
              {filteredSorted.map((req) => {
                const dd = req.customer?.dealerDetail;
                const name = req.customer?.companyName || req.customer?.name || "-";
                const tempAmount = req.amount ? formatNumber(req.amount) : "-";
                const exp = req.expiryDate ? new Date(req.expiryDate) : null;
                return (
                  <Paper key={req.id} variant="outlined" sx={{ p: 1 }}>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="flex-start"
                      justifyContent="space-between"
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Tooltip title={name} arrow>
                          <Typography
                            component="span"
                            noWrap
                            sx={{
                              display: "inline-block",
                              fontWeight: 700,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: "100%",
                            }}
                          >
                            {truncate(name, 33)}
                          </Typography>
                        </Tooltip>
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: "wrap" }}>
                          <Typography variant="body2">
                            วงเงิน: {dd?.creditLimit != null ? formatNumber(dd.creditLimit) : "-"}
                          </Typography>
                          <Typography variant="body2">วงเงินชั่วคราว: {tempAmount}</Typography>
                          <Typography variant="body2">
                            หมดอายุ: {exp ? exp.toLocaleDateString("th-TH") : "-"}
                          </Typography>
                        </Stack>
                      </Box>
                      <Stack spacing={1} sx={{ ml: 1 }}>
                        {canEditLimits && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setEditCustomer(req.customer)}
                          >
                            แก้ไข
                          </Button>
                        )}
                        {/* delete for mobile: approver or owner */}
                        {(canApprove ||
                          req.requestedBy?.id === session?.user?.id ||
                          req.requestedByUserId === session?.user?.id) && (
                          <Button size="small" color="error" onClick={() => setConfirmDelete(req)}>
                            ลบ
                          </Button>
                        )}
                        <Button
                          size="small"
                          onClick={() => router.push(`/dashboard/customers/${req.customer?.id}`)}
                        >
                          ดูร้าน
                        </Button>
                        <Button
                          size="small"
                          onClick={() => {
                            setSelected(req);
                          }}
                        >
                          รายละเอียด
                        </Button>
                      </Stack>
                    </Stack>
                  </Paper>
                );
              })}
              {filteredSorted.length === 0 && (
                <EmptyTableMessage colSpan={1} message={loading ? "กำลังโหลด..." : "ไม่พบคำขอ"} />
              )}
            </Stack>
          )}
        </Box>

        {/* Modern pagination (match products) */}
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="แสดงต่อหน้า"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} จาก ${count}`}
          slots={{ actions: TablePaginationActionsModern as any }}
          sx={{
            px: 2,
            borderTop: "1px solid",
            borderColor: "divider",
            bgcolor: "grey.50",
            "& .MuiTablePagination-toolbar": {
              gap: 1,
              justifyContent: { xs: "center", sm: "space-between" },
            },
            "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
              fontWeight: 600,
              color: "text.secondary",
            },
            "& .MuiTablePagination-select": {
              borderRadius: 2,
              px: 1,
            },
            "& .MuiTablePagination-actions": {
              alignItems: "center",
            },
          }}
        />
      </Paper>

      <Snackbar
        open={showSaved}
        message="บันทึกสำเร็จ"
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={() => setShowSaved(false)}
        autoHideDuration={3000}
      />

      {/* Details Dialog (unchanged) */}
      <Dialog
        open={Boolean(selected) && !rejectOpen}
        onClose={() => setSelected(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>รายละเอียดคำขอ</DialogTitle>
        <DialogContent>
          {selected ? (
            <Stack spacing={1} sx={{ mt: 1 }}>
              <Typography>
                <strong>รหัสคำขอ:</strong> {selected.id}
              </Typography>
              <Typography>
                <strong>ร้าน:</strong>{" "}
                {selected.customer?.companyName || selected.customer?.name || "-"}
              </Typography>
              <Typography>
                <strong>จำนวน:</strong> {selected.amount ? formatNumber(selected.amount) : "-"}
              </Typography>
              <Typography>
                <strong>วันหมดอายุ:</strong>{" "}
                {selected.expiryDate
                  ? new Date(selected.expiryDate).toLocaleDateString("th-TH")
                  : "-"}
              </Typography>
              <Typography>
                <strong>สถานะ:</strong> {renderStatusChip(selected)}
              </Typography>
              <Typography>
                <strong>เหตุผล / หมายเหตุ:</strong>
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                {selected.reason || "-"}
              </Typography>
              {selected.processedBy?.name && (
                <Typography>
                  <strong>ดำเนินการโดย:</strong> {selected.processedBy.name}
                </Typography>
              )}
              {!selected.processedBy?.name && selected.processedByUserId && (
                <Typography>
                  <strong>ดำเนินการโดย:</strong> {selected.processedByUserId}
                </Typography>
              )}
              {selected.processedAt && (
                <Typography>
                  <strong>ดำเนินการเมื่อ:</strong>{" "}
                  {new Date(selected.processedAt).toLocaleString("th-TH")}
                </Typography>
              )}
              {selected.rejectReason && (
                <>
                  <Typography>
                    <strong>หมายเหตุการปฏิเสธ:</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                    {selected.rejectReason}
                  </Typography>
                </>
              )}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelected(null)}>ปิด</Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>ปฏิเสธคำขอ พร้อมหมายเหตุ</DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ mt: 1 }}>
            <Typography>กรุณากรอกเหตุผลการปฏิเสธ (ไม่บังคับ)</Typography>
            <TextField
              fullWidth
              multiline
              minRows={3}
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="หมายเหตุสำหรับผู้ขอ"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectOpen(false)}>ยกเลิก</Button>
          <Button
            color="error"
            onClick={async () => {
              if (!selected) return;
              try {
                await fetch(`/api/credit-requests/${selected.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "reject", note: rejectNote }),
                });
                setRejectOpen(false);
                setSelected(null);
                load();
              } catch (err) {
                console.error(err);
              }
            }}
          >
            ยืนยันปฏิเสธ
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>ยืนยันการลบคำขอ</DialogTitle>
        <DialogContent>
          <Typography>คุณต้องการลบคำขอวงเงินนี้หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>ยกเลิก</Button>
          <Button
            color="error"
            variant="contained"
            onClick={async () => {
              if (!confirmDelete) return;
              try {
                const res = await fetch(`/api/credit-requests/${confirmDelete.id}`, {
                  method: "DELETE",
                });
                if (!res.ok) {
                  const d = await res.json().catch(() => ({}));
                  throw new Error(d?.error || "ลบไม่สำเร็จ");
                }
                setConfirmDelete(null);
                load();
              } catch (err) {
                console.error(err);
                setConfirmDelete(null);
              }
            }}
          >
            ยืนยัน
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit limits dialog */}
      {editCustomer && canEditLimits && (
        <CreditLimitEditDialog
          customer={editCustomer}
          onClose={() => setEditCustomer(null)}
          onSaved={() => {
            setEditCustomer(null);
            setShowSaved(true);
            load();
          }}
        />
      )}
    </>
  );
}
