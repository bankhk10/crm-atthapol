"use client";

import { useMemo, useState } from "react";
import { alpha } from "@mui/material/styles";
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
  Checkbox,
  TableSortLabel,
  TablePagination,
  FormControlLabel,
  Switch,
  Tooltip,
} from "@mui/material";
import { visuallyHidden } from "@mui/utils";
import SearchIcon from "@mui/icons-material/Search";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DeleteIcon from "@mui/icons-material/Delete";
import FilterListIcon from "@mui/icons-material/FilterList";
import Link from "next/link";
import type { ProductListItem } from "../data";
import { deleteProduct } from "../delete";

type Props = { products: ProductListItem[] };

type Order = "asc" | "desc";

type ProductSortableKeys =
  | "productCode"
  | "nameTH"
  | "category"
  | "brand"
  | "stockOnHand"
  | "price"
  | "status";

interface HeadCell {
  id: ProductSortableKeys;
  label: string;
  numeric?: boolean;
  disablePadding?: boolean;
}

const headCells: readonly HeadCell[] = [
  { id: "productCode", label: "รหัส", disablePadding: true },
  { id: "nameTH", label: "ชื่อสินค้า" },
  { id: "category", label: "หมวดหมู่" },
  { id: "brand", label: "ยี่ห้อ" },
  { id: "stockOnHand", label: "สต็อก", numeric: true },
  { id: "price", label: "ราคา", numeric: true },
  { id: "status", label: "สถานะ" },
];

function descendingComparator<T extends Record<string, any>>(
  a: T,
  b: T,
  orderBy: keyof T
) {
  const av = a[orderBy];
  const bv = b[orderBy];
  if (typeof av === "number" && typeof bv === "number") {
    if (bv < av) return -1;
    if (bv > av) return 1;
    return 0;
  }
  const as = (av ?? "").toString().toLowerCase();
  const bs = (bv ?? "").toString().toLowerCase();
  if (bs < as) return -1;
  if (bs > as) return 1;
  return 0;
}

function getComparator<Key extends keyof any>(order: Order, orderBy: Key) {
  return order === "desc"
    ? (
        a: { [key in Key]: number | string | null },
        b: { [key in Key]: number | string | null }
      ) => descendingComparator(a, b, orderBy)
    : (
        a: { [key in Key]: number | string | null },
        b: { [key in Key]: number | string | null }
      ) => -descendingComparator(a, b, orderBy);
}

interface EnhancedTableProps {
  numSelected: number;
  onRequestSort: (
    event: React.MouseEvent<unknown>,
    property: ProductSortableKeys
  ) => void;
  onSelectAllClick: (event: React.ChangeEvent<HTMLInputElement>) => void;
  order: Order;
  orderBy: ProductSortableKeys;
  rowCount: number;
}

function EnhancedTableHead(props: EnhancedTableProps) {
  const {
    onSelectAllClick,
    order,
    orderBy,
    numSelected,
    rowCount,
    onRequestSort,
  } = props;
  const createSortHandler =
    (property: ProductSortableKeys) => (event: React.MouseEvent<unknown>) => {
      onRequestSort(event, property);
    };

  return (
    <TableHead>
      <TableRow>
        {/* <TableCell padding="checkbox">
          <Checkbox
            color="primary"
            indeterminate={numSelected > 0 && numSelected < rowCount}
            checked={rowCount > 0 && numSelected === rowCount}
            onChange={onSelectAllClick}
            inputProps={{
              "aria-label": "select all products",
            }}
          />
        </TableCell> */}
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
        <TableCell align="right">การกระทำ</TableCell>
      </TableRow>
    </TableHead>
  );
}

interface EnhancedTableToolbarProps {
  numSelected: number;
  title?: string;
  query: string;
  onQueryChange: (value: string) => void;
  onBulkDelete: () => void;
}

function EnhancedTableToolbar(props: EnhancedTableToolbarProps) {
  const {
    numSelected,
    title = "สินค้า",
    query,
    onQueryChange,
    onBulkDelete,
  } = props;
  return (
    <Toolbar
      sx={[
        { pl: { sm: 2 }, pr: { xs: 1, sm: 1 } },
        numSelected > 0 && {
          bgcolor: (theme) =>
            alpha(
              theme.palette.primary.main,
              theme.palette.action.activatedOpacity
            ),
        },
      ]}
    >
      {numSelected > 0 ? (
        <Typography
          sx={{ flex: "1 1 100%" }}
          color="inherit"
          variant="subtitle1"
          component="div"
        >
          เลือกแล้ว {numSelected} รายการ
        </Typography>
      ) : (
        <Typography
          sx={{ flex: "1 1 100%" }}
          variant="h6"
          id="tableTitle"
          component="div"
        >
          {title}
        </Typography>
      )}
      {numSelected > 0 ? (
        <Tooltip title="ลบ">
          <IconButton onClick={onBulkDelete} aria-label="bulk-delete">
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      ) : (
        <Stack direction="row" spacing={1} alignItems="center">
          <Box
            sx={{ position: "relative", width: { xs: 200, sm: 260, md: 360 } }}
          >
            <TextField
              fullWidth
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="ค้นหา (รหัส/ชื่อ/หมวด/ยี่ห้อ/สถานะ)"
              InputProps={{
                startAdornment: (
                  <SearchIcon fontSize="small" style={{ marginRight: 8 }} />
                ),
              }}
              size="small"
            />
          </Box>
          {/* <Tooltip title="กรองรายการ">
            <IconButton aria-label="filter-list">
              <FilterListIcon />
            </IconButton>
          </Tooltip> */}
        </Stack>
      )}
    </Toolbar>
  );
}

export function ProductsTable({ products }: Props) {
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ProductListItem | null>(
    null
  );
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  const [order, setOrder] = useState<Order>("asc");
  const [orderBy, setOrderBy] = useState<ProductSortableKeys>("productCode");
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [page, setPage] = useState(0);
  const [dense, setDense] = useState(false);
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
    event: React.MouseEvent<unknown>,
    property: ProductSortableKeys
  ) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = filtered.map((n) => n.id);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleRowClick = (_event: React.MouseEvent<unknown>, id: string) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected: readonly string[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1)
      );
    }
    setSelected(newSelected);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleChangeDense = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDense(event.target.checked);
  };

  const emptyRows =
    page > 0 ? Math.max(0, (1 + page) * rowsPerPage - filtered.length) : 0;

  const visibleRows = useMemo(
    () =>
      [...filtered]
        .sort(getComparator(order, orderBy))
        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filtered, order, orderBy, page, rowsPerPage]
  );

  const isSelected = (id: string) => selected.includes(id);

  return (
    <Paper sx={{ p: { xs: 1, sm: 2 } }}>
      <EnhancedTableToolbar
        numSelected={selected.length}
        query={query}
        onQueryChange={(v) => setQuery(v)}
        onBulkDelete={() => setBulkConfirmOpen(true)}
      />

      <TableContainer sx={{ maxWidth: "100%", overflowX: "auto" }}>
        <Table
          size={dense ? "small" : "medium"}
          stickyHeader
          sx={{ minWidth: 900 }}
          aria-labelledby="tableTitle"
        >
          <EnhancedTableHead
            numSelected={selected.length}
            order={order}
            orderBy={orderBy}
            onSelectAllClick={handleSelectAllClick}
            onRequestSort={handleRequestSort}
            rowCount={filtered.length}
          />
          <TableBody>
            {visibleRows.map((p, index) => {
              const isItemSelected = isSelected(p.id);
              const labelId = `enhanced-table-checkbox-${index}`;
              return (
                <TableRow
                  hover
                  onClick={(event) => handleRowClick(event, p.id)}
                  role="checkbox"
                  aria-checked={isItemSelected}
                  tabIndex={-1}
                  key={p.id}
                  selected={isItemSelected}
                  sx={{ cursor: "pointer" }}
                >
                  {/* <TableCell padding="checkbox">
                    <Checkbox
                      color="primary"
                      checked={isItemSelected}
                      inputProps={{ "aria-labelledby": labelId }}
                    />
                  </TableCell> */}
                  <TableCell
                    component="th"
                    id={labelId}
                    scope="row"
                    padding="none"
                    sx={{ whiteSpace: "nowrap" }}
                  >
                    <Link
                      href={`/dashboard/products/${p.id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {p.productCode}
                    </Link>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {p.nameTH}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {p.category || "-"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {p.brand || "-"}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{p.stockOnHand}</TableCell>
                  <TableCell align="right">{p.price ?? "-"}</TableCell>
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
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    <IconButton
                      component={Link}
                      href={`/dashboard/products/${p.id}/edit`}
                      aria-label="edit"
                      size="small"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      aria-label="delete"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(p);
                      }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
            {visibleRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={headCells.length + 2} align="center">
                  <Typography color="text.secondary">
                    ไม่พบข้อมูลสินค้า
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {emptyRows > 0 && (
              <TableRow style={{ height: (dense ? 33 : 53) * emptyRows }}>
                <TableCell colSpan={headCells.length + 2} />
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

      {/* <FormControlLabel
        control={<Switch checked={dense} onChange={handleChangeDense} />}
        label="แสดงแบบหนาแน่น"
      /> */}

      {/* Single delete dialog */}
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

      {/* Bulk delete dialog */}
      <Dialog open={bulkConfirmOpen} onClose={() => setBulkConfirmOpen(false)}>
        <DialogTitle>ลบสินค้าหลายรายการ</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ยืนยันการลบ {selected.length} รายการหรือไม่?
            การกระทำนี้ไม่สามารถย้อนกลับได้
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkConfirmOpen(false)} color="inherit">
            ยกเลิก
          </Button>
          <Button
            onClick={async () => {
              try {
                for (const id of selected) {
                  await deleteProduct(id);
                }
                setSelected([]);
                setBulkConfirmOpen(false);
              } catch (e) {
                setBulkConfirmOpen(false);
              }
            }}
            color="error"
            variant="contained"
            startIcon={<DeleteIcon />}
          >
            ลบ
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
