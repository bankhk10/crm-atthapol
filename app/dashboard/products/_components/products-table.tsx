"use client";

import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import FirstPageIcon from "@mui/icons-material/FirstPage";
import FormatListBulletedAddIcon from "@mui/icons-material/FormatListBulletedAdd";
import KeyboardArrowLeft from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRight from "@mui/icons-material/KeyboardArrowRight";
import LastPageIcon from "@mui/icons-material/LastPage";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import {
  Box,
  Chip,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  TableSortLabel,
  TablePagination,
  Tooltip,
} from "@mui/material";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";

import { hasPermission } from "@/lib/permissions";

import { deleteProduct } from "../delete";

import type { ProductListItem } from "../data";

type Props = { products: ProductListItem[]; query?: string };

type Order = "asc" | "desc";
type SortableKeys =
  | "productCode"
  | "nameTH"
  | "brand"
  | "price"
  | "status"
  | "stockOnHand"
  | "stockAvailable"
  | "stockReserved"
  | "createdAt";

interface HeadCell {
  id: SortableKeys;
  label: string;
  width: number;
  numeric?: boolean;
  disablePadding?: boolean;
}

const headCells: readonly HeadCell[] = [
  { id: "productCode", label: "รหัสสินค้า", width: 110 },
  { id: "nameTH", label: "ชื่อสินค้า", width: 230 },
  { id: "brand", label: "แบรนด์", width: 100 },
  { id: "stockOnHand", label: "จำนวนสินค้า", width: 90, numeric: true },
  { id: "stockAvailable", label: "พร้อมขาย", width: 90, numeric: true },
  { id: "stockReserved", label: "สต็อกจอง", width: 90, numeric: true },
  { id: "status", label: "สถานะ", width: 130 },
];

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

const numericKeys = new Set<SortableKeys>([
  "price",
  "stockOnHand",
  "stockAvailable",
  "stockReserved",
]);

function descendingComparator(a: ProductListItem, b: ProductListItem, orderBy: SortableKeys) {
  const av = a[orderBy];
  const bv = b[orderBy];
  if (numericKeys.has(orderBy)) {
    const an = Number(av ?? 0);
    const bn = Number(bv ?? 0);
    return bn - an;
  } else {
    const as = String(av ?? "").toLowerCase();
    const bs = String(bv ?? "").toLowerCase();
    if (bs < as) return -1;
    if (bs > as) return 1;
    return 0;
  }
}

function getComparator(order: Order, orderBy: SortableKeys) {
  return order === "asc"
    ? (a: ProductListItem, b: ProductListItem) => descendingComparator(a, b, orderBy)
    : (a: ProductListItem, b: ProductListItem) => -descendingComparator(a, b, orderBy);
}

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
  const cells: readonly HeadCell[] = headCells.map((h) =>
    h.id === "brand" ? { ...h, id: "price", label: "ราคา" } : h,
  );
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
        {cells.map((headCell) => (
          <TableCell
            key={headCell.id}
            align={
              ["price", "stockOnHand", "stockAvailable", "stockReserved", "status"].includes(
                headCell.id,
              )
                ? "center"
                : "left"
            }
            sx={{
              width: headCell.width,
              display: ["price", "expDate"].includes(headCell.id)
                ? { xs: "none", md: "table-cell" }
                : "table-cell",
            }}
          >
            <Tooltip title={`เรียงตาม ${headCell.label}`} arrow>
              <TableSortLabel
                active={orderBy === headCell.id}
                direction={orderBy === headCell.id ? order : "asc"}
                sx={{
                  color: "inherit !important",
                  "& .MuiTableSortLabel-icon": { color: "#fff !important" },
                }}
                onClick={createSortHandler(headCell.id)}
              >
                {headCell.label}
                {orderBy === headCell.id && (
                  <Box component="span" sx={visuallyHidden}>
                    {order === "desc" ? "sorted descending" : "sorted ascending"}
                  </Box>
                )}
              </TableSortLabel>
            </Tooltip>
          </TableCell>
        ))}
        {showActions && (
          <TableCell align="center" sx={{ width: 120 }}>
            <Tooltip title="การกระทำ" arrow>
              <span>การกระทำ</span>
            </Tooltip>
          </TableCell>
        )}
      </TableRow>
    </TableHead>
  );
}

export function ProductsTable({ products, query }: Props) {
  const { data: session } = useSession();

  const [deleteTarget, setDeleteTarget] = useState<ProductListItem | null>(null);

  const [order, setOrder] = useState<Order>("asc");
  const [orderBy, setOrderBy] = useState<SortableKeys>("createdAt");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const filtered = useMemo(() => {
    const q = (query ?? "").trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [
        p.productCode,
        p.nameTH,
        p.brand ?? "",
        p.status,
        p.category, // ยังรองรับค้นหาด้วยหมวด แม้ไม่ได้แสดงคอลัมน์
        String(p.stockOnHand ?? 0),
        String((p as any).stockAvailable ?? 0),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [products, query]);

  const handleRequestSort = (_: React.MouseEvent<unknown>, property: SortableKeys) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const visibleRows = useMemo(
    () =>
      [...filtered]
        .sort(getComparator(order, orderBy))
        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
        .map((p) => ({ ...p, brand: undefined })),
    [filtered, order, orderBy, page, rowsPerPage],
  );

  const fmtDate = (iso?: string | null) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(
      2,
      "0",
    )}/${d.getFullYear()}`;
  };

  const canViewAll = hasPermission(session?.user?.permissions, "products", "view");
  const canEditAll = hasPermission(session?.user?.permissions, "products", "edit");
  const canDeleteAll = hasPermission(session?.user?.permissions, "products", "delete");
  const showActions = canViewAll || canEditAll || canDeleteAll;

  // Modern pagination actions
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
          onClick={(e) => onPageChange(e, 0)}
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
          onClick={(e) => onPageChange(e, Math.max(0, page - 1))}
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
          onClick={(e) => onPageChange(e, Math.min(lastPage, page + 1))}
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
          onClick={(e) => onPageChange(e, lastPage)}
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

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 2,
        overflow: "hidden",
        borderColor: "#ddd",
        fontFamily: "Prompt, sans-serif",
      }}
    >
      {/* Mobile cards layout (match sales/orders) */}
      <Stack spacing={1.25} sx={{ p: 1.5, display: { xs: "block", md: "none" } }}>
        {visibleRows.map((p) => (
          <Paper key={p.id} variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                {/* <Typography fontWeight={700}>{p.nameTH}</Typography> */}
                <Tooltip title={p.nameTH}>
                  <Typography
                    fontWeight={700}
                    noWrap
                    sx={{
                      maxWidth: 200, // ปรับขนาดตาม layout ของคุณ
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      display: "block",
                    }}
                  >
                    {p.nameTH.length > 20 ? p.nameTH.slice(0, 20) + "..." : p.nameTH}
                  </Typography>
                </Tooltip>
                <Chip
                  size="small"
                  label={
                    p.status === "ACTIVE"
                      ? "ใช้งานอยู่"
                      : p.status === "INACTIVE"
                        ? "ไม่ใช้งาน"
                        : p.status === "EXPIRED"
                          ? "หมดอายุ"
                          : "ใกล้หมดอายุ"
                  }
                  sx={{
                    fontWeight: 600,
                    px: 1.2,
                    borderRadius: "9999px",
                    color:
                      p.status === "ACTIVE"
                        ? "#fff"
                        : p.status === "INACTIVE"
                          ? "#424242"
                          : p.status === "EXPIRED"
                            ? "#fff"
                            : "#000",
                    bgcolor:
                      p.status === "ACTIVE"
                        ? "#1da729ff"
                        : p.status === "INACTIVE"
                          ? "#E0E0E0"
                          : p.status === "EXPIRED"
                            ? "#EF4444"
                            : "#FACC15",
                  }}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                รหัส: {p.productCode} {p.brand ? `• แบรนด์: ${p.brand}` : ""}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {p.price != null
                  ? `ราคา: ${p.price.toLocaleString("th-TH", { style: "currency", currency: "THB" })}`
                  : "ราคา: -"}
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Chip size="small" label={`จำนวน: ${p.stockOnHand}`} />
                <Chip
                  size="small"
                  label={`พร้อมขาย: ${p.stockAvailable ?? Math.max(0, (p.stockOnHand ?? 0) - (p.stockReserved ?? 0))}`}
                />
                <Chip size="small" label={`จอง: ${p.stockReserved}`} />
              </Stack>
              {showActions && (
                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                  <Tooltip title="จัดการสต็อก/ราคา" arrow>
                    <IconButton
                      component={Link}
                      href={`/dashboard/products/${p.id}/inventory`}
                      size="small"
                      sx={{
                        color: "#fd810dff",
                        borderRadius: 2,
                        "&:hover": {
                          bgcolor: "#fd810dff",
                          color: "common.white",
                        },
                        transition: "all .15s ease",
                      }}
                    >
                      <FormatListBulletedAddIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="ดูรายละเอียด" arrow>
                    <IconButton
                      component={Link}
                      href={`/dashboard/products/${p.id}`}
                      size="small"
                      sx={{
                        color: "primary.main",
                        borderRadius: 2,
                        "&:hover": { bgcolor: "primary.main", color: "common.white" },
                        transition: "all .15s ease",
                      }}
                    >
                      <VisibilityOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="แก้ไข" arrow>
                    <IconButton
                      component={Link}
                      href={`/dashboard/products/${p.id}/edit`}
                      size="small"
                      sx={{
                        color: "secondary.main",
                        borderRadius: 2,
                        "&:hover": { bgcolor: "secondary.main", color: "common.white" },
                        transition: "all .15s ease",
                      }}
                    >
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="ลบ" arrow>
                    <IconButton
                      size="small"
                      onClick={() => setDeleteTarget(p)}
                      sx={{
                        color: "error.main",
                        borderRadius: 2,
                        "&:hover": { bgcolor: "error.main", color: "common.white" },
                        transition: "all .15s ease",
                      }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              )}
            </Stack>
          </Paper>
        ))}
        {visibleRows.length === 0 && (
          <Typography color="text.secondary" align="center">
            ไม่พบข้อมูลสินค้า
          </Typography>
        )}
      </Stack>

      {/* Desktop table layout */}
      <TableContainer
        sx={{
          display: { xs: "none", md: "block" },
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          "&::-webkit-scrollbar": { width: 8 },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "#ccc",
            borderRadius: 6,
          },
        }}
      >
        <Table aria-labelledby="tableTitle" sx={{ minWidth: 900, tableLayout: "fixed" }}>
          <EnhancedTableHead
            order={order}
            orderBy={orderBy}
            onRequestSort={handleRequestSort}
            showActions={showActions}
          />
          <TableBody>
            {visibleRows.map((p) => (
              <TableRow
                hover
                key={p.id}
                sx={{
                  "&:nth-of-type(even)": { bgcolor: "#fafafa" },
                  "&:hover": { bgcolor: "#f0f0f0" },
                }}
              >
                <TableCell
                  sx={{
                    width: 230,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  <Tooltip title={p.productCode} arrow>
                    <span>{p.productCode}</span>
                  </Tooltip>
                </TableCell>
                <TableCell
                  sx={{
                    width: 230,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  <Tooltip title={p.nameTH} arrow>
                    <span>{p.nameTH}</span>
                  </Tooltip>
                </TableCell>
                <TableCell
                  sx={{
                    width: 100,
                    display: { xs: "none", md: "table-cell" },
                  }}
                  align="center"
                >
                  <Tooltip
                    title={
                      p.price != null
                        ? p.price.toLocaleString("th-TH", { style: "currency", currency: "THB" })
                        : "-"
                    }
                    arrow
                  >
                    <span>
                      {p.price != null
                        ? p.price.toLocaleString("th-TH", { style: "currency", currency: "THB" })
                        : "-"}
                    </span>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ width: 90 }} align="center">
                  <Tooltip title={String(p.stockOnHand)} arrow>
                    <span>{p.stockOnHand}</span>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ width: 90 }} align="center">
                  <Tooltip
                    title={String(
                      p.stockAvailable ??
                        Math.max(0, (p.stockOnHand ?? 0) - (p.stockReserved ?? 0)),
                    )}
                    arrow
                  >
                    <span>
                      {p.stockAvailable ??
                        Math.max(0, (p.stockOnHand ?? 0) - (p.stockReserved ?? 0))}
                    </span>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ width: 90 }} align="center">
                  <Tooltip title={String(p.stockReserved)} arrow>
                    <span>{p.stockReserved}</span>
                  </Tooltip>
                </TableCell>
                {/* removed วันหมดอายุ column */}
                <TableCell sx={{ width: 130 }} align="center">
                  <Tooltip title={p.status} arrow>
                    <Chip
                      size="small"
                      label={
                        p.status === "ACTIVE"
                          ? "ใช้งานอยู่"
                          : p.status === "INACTIVE"
                            ? "ไม่ใช้งาน"
                            : p.status === "EXPIRED"
                              ? "หมดอายุ"
                              : "ใกล้หมดอายุ"
                      }
                      sx={{
                        fontWeight: 600,
                        px: 1.5,
                        py: 2,
                        borderRadius: "9999px",
                        color:
                          p.status === "ACTIVE"
                            ? "#fff"
                            : p.status === "INACTIVE"
                              ? "#424242"
                              : p.status === "EXPIRED"
                                ? "#fff"
                                : "#000",
                        bgcolor:
                          p.status === "ACTIVE"
                            ? "#1da729ff"
                            : p.status === "INACTIVE"
                              ? "#E0E0E0"
                              : p.status === "EXPIRED"
                                ? "#EF4444"
                                : "#FACC15",
                      }}
                    />
                  </Tooltip>
                </TableCell>
                {showActions && (
                  <TableCell align="center" sx={{ width: 120 }}>
                    <Stack direction="row" justifyContent="center" spacing={0.5}>
                      <Tooltip title="จัดการสต็อก/ราคา" arrow>
                        <IconButton
                          component={Link}
                          href={`/dashboard/products/${p.id}/inventory`}
                          size="small"
                          sx={{
                            color: "#fd810dff",
                            borderRadius: 2,
                            "&:hover": {
                              bgcolor: "#fd810dff",
                              color: "common.white",
                            },
                            transition: "all .15s ease",
                          }}
                        >
                          <FormatListBulletedAddIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="ดูรายละเอียด" arrow>
                        <IconButton
                          component={Link}
                          href={`/dashboard/products/${p.id}`}
                          size="small"
                          sx={{
                            color: "primary.main",
                            borderRadius: 2,
                            "&:hover": { bgcolor: "primary.main", color: "common.white" },
                            transition: "all .15s ease",
                          }}
                        >
                          <VisibilityOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="แก้ไข" arrow>
                        <IconButton
                          component={Link}
                          href={`/dashboard/products/${p.id}/edit`}
                          size="small"
                          sx={{
                            color: "secondary.main",
                            borderRadius: 2,
                            "&:hover": { bgcolor: "secondary.main", color: "common.white" },
                            transition: "all .15s ease",
                          }}
                        >
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="ลบ" arrow>
                        <IconButton
                          size="small"
                          onClick={() => setDeleteTarget(p)}
                          sx={{
                            color: "error.main",
                            borderRadius: 2,
                            "&:hover": { bgcolor: "error.main", color: "common.white" },
                            transition: "all .15s ease",
                          }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {visibleRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={headCells.length + (showActions ? 1 : 0)} align="center">
                  <Typography color="text.secondary" fontFamily="Prompt">
                    ไม่พบข้อมูลสินค้า
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={filtered.length}
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

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <DialogTitle fontFamily="Prompt">ลบสินค้า</DialogTitle>
        <DialogContent>
          <DialogContentText fontFamily="Prompt">
            ยืนยันการลบ {deleteTarget?.productCode ?? "สินค้า"}? การกระทำนี้ไม่สามารถย้อนกลับได้
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} color="inherit">
            ยกเลิก
          </Button>
          <Button
            onClick={async () => {
              if (!deleteTarget) return;
              try {
                await deleteProduct(deleteTarget.id);
                setDeleteTarget(null);
              } catch {
                setDeleteTarget(null);
              }
            }}
            color="error"
            variant="contained"
            startIcon={<DeleteOutlineIcon />}
          >
            ลบ
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
