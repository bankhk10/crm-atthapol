"use client";

import { useMemo, useState } from "react";
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
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Toolbar,
  TableSortLabel,
  TablePagination,
  Tooltip,
} from "@mui/material";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/permissions";
import SearchIcon from "@mui/icons-material/Search";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import Link from "next/link";
import type { ProductListItem } from "../data";
import { deleteProduct } from "../delete";

type Props = { products: ProductListItem[] };

type Order = "asc" | "desc";
type SortableKeys =
  | "productCode"
  | "nameTH"
  | "brand"
  | "status"
  | "category"
  | "expDate"
  | "createdAt";

interface HeadCell {
  id: SortableKeys;
  label: string;
  numeric?: boolean;
  disablePadding?: boolean;
}

const headCells: readonly HeadCell[] = [
  { id: "productCode", label: "รหัสสินค้า" },
  { id: "nameTH", label: "ชื่อสินค้า" },
  { id: "brand", label: "แบรนด์" },
  { id: "category", label: "หมวดหมู่" },
  { id: "expDate", label: "วันหมดอายุ" },
  { id: "status", label: "สถานะ" },
];

// Inline visually-hidden styles to avoid importing @mui/utils
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

function descendingComparator(
  a: ProductListItem,
  b: ProductListItem,
  orderBy: SortableKeys
) {
  const av = a[orderBy];
  const bv = b[orderBy];
  if (typeof av === "number" && typeof bv === "number") {
    if (bv < av) return -1;
    if (bv > av) return 1;
    return 0;
  }
  const as = String(av ?? "").toLowerCase();
  const bs = String(bv ?? "").toLowerCase();
  if (bs < as) return -1;
  if (bs > as) return 1;
  return 0;
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
  const createSortHandler =
    (property: SortableKeys) => (event: React.MouseEvent<unknown>) => {
      onRequestSort(event, property);
    };
  return (
    <TableHead
      sx={{
        bgcolor: "grey.100",
        "& .MuiTableCell-root": { bgcolor: "grey.100" },
      }}
    >
      <TableRow>
        {headCells.map((headCell) => (
          <TableCell
            key={headCell.id}
            align={headCell.numeric ? "right" : "left"}
            padding={headCell.disablePadding ? "none" : "normal"}
            sortDirection={orderBy === headCell.id ? order : false}
          >
            <TableSortLabel
              active={orderBy === headCell.id}
              direction={orderBy === headCell.id ? order : "asc"}
              onClick={createSortHandler(headCell.id)}
            >
              {headCell.label}
              {orderBy === headCell.id ? (
                <Box component="span" sx={visuallyHidden}>
                  {order === "desc" ? "sorted descending" : "sorted ascending"}
                </Box>
              ) : null}
            </TableSortLabel>
          </TableCell>
        ))}
        {showActions && (
          <TableCell align="center" padding="normal">การกระทำ</TableCell>
        )}
      </TableRow>
    </TableHead>
  );
}

export function ProductsTable({ products }: Props) {
  const { data: session } = useSession();
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ProductListItem | null>(
    null
  );

  const [order, setOrder] = useState<Order>("asc");
  const [orderBy, setOrderBy] = useState<SortableKeys>("createdAt");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [p.productCode, p.nameTH, p.category, p.brand ?? "", p.status]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [products, query]);

  const handleRequestSort = (
    _: React.MouseEvent<unknown>,
    property: SortableKeys
  ) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const visibleRows = useMemo(
    () =>
      [...filtered]
        .sort(getComparator(order, orderBy))
        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filtered, order, orderBy, page, rowsPerPage]
  );

  const fmtDate = (iso?: string | null) => {
    if (!iso) return "-";
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const canViewAll = hasPermission(session?.user?.permissions, "products", "view");
  const canEditAll = hasPermission(session?.user?.permissions, "products", "edit");
  const canDeleteAll = hasPermission(session?.user?.permissions, "products", "delete");
  const showActions = canViewAll || canEditAll || canDeleteAll;

  return (
    <Paper
      variant="outlined"
      sx={{ p: 0, borderRadius: 2, overflow: "hidden" }}
    >
      <Toolbar sx={{ pl: { sm: 2 }, pr: { xs: 2, sm: 2 }, py: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: 'auto' }}>
          <Box sx={{ position: "relative", width: { xs: 200, sm: 260, md: 360 } }}>
            <TextField
              fullWidth
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหา (รหัส/ชื่อ/หมวด/ยี่ห้อ/สถานะ)"
              InputProps={{
                startAdornment: (
                  <SearchIcon fontSize="small" style={{ marginRight: 8 }} />
                ),
              }}
              size="small"
            />
          </Box>
          {hasPermission(session?.user?.permissions, 'products', 'create') && (
            <Button component={Link} href="/dashboard/products/new" variant="contained" color="primary" sx={{ whiteSpace: 'nowrap' }}>
              เพิ่มสินค้า
            </Button>
          )}
        </Stack>
      </Toolbar>

      <TableContainer>
        <Table stickyHeader aria-labelledby="tableTitle" sx={{ minWidth: 900 }}>
          <EnhancedTableHead
            order={order}
            orderBy={orderBy}
            onRequestSort={handleRequestSort}
            showActions={showActions}
          />
          <TableBody>
            {visibleRows.map((p) => {
              const canView = hasPermission(session?.user?.permissions, 'products', 'view');
              const canEdit = hasPermission(session?.user?.permissions, 'products', 'edit');
              const canDelete = hasPermission(session?.user?.permissions, 'products', 'delete');
              return (
              <TableRow hover key={p.id}>
                <TableCell sx={{ whiteSpace: "nowrap" }}>
                  {p.productCode}
                </TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{p.nameTH}</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>
                  {p.brand ?? "-"}
                </TableCell>
                <TableCell>{p.category}</TableCell>
                <TableCell>{fmtDate(p.expDate)}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={p.status}
                    color={
                      p.status === "ACTIVE"
                        ? "success"
                        : p.status === "EXPIRED"
                        ? "warning"
                        : "default"
                    }
                    variant="outlined"
                  />
                </TableCell>
                {showActions && (
                <TableCell align="center" sx={{ width: 140, px: 0.5 }}>
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
                    {canView && (
                      <Tooltip title="ดูรายละเอียด" placement="top">
                        <IconButton component={Link} href={`/dashboard/products/${p.id}`} aria-label="view" size="small" sx={{ m: 0 }}>
                          <VisibilityOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {canEdit && (
                      <Tooltip title="แก้ไข" placement="top">
                        <IconButton component={Link} href={`/dashboard/products/${p.id}/edit`} aria-label="edit" size="small" sx={{ m: 0 }}>
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {canDelete && (
                      <Tooltip title="ลบ" placement="top">
                        <IconButton aria-label="delete" size="small" onClick={() => setDeleteTarget(p)} sx={{ m: 0 }}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
                )}
              </TableRow>
            );})}
            {visibleRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={headCells.length + (showActions ? 1 : 0)} align="center">
                  <Typography color="text.secondary">
                    ไม่พบข้อมูลสินค้า
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={filtered.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
      >
        <DialogTitle>ลบสินค้า</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ยืนยันการลบ {deleteTarget?.productCode ?? "สินค้า"}?
            การกระทำนี้ไม่สามารถย้อนกลับได้
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
              } catch (e) {
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
