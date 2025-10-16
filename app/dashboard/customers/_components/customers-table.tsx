"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  // TextField,
  Typography,
  TableSortLabel,
  TablePagination,
  Tooltip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
// import SearchIcon from "@mui/icons-material/Search";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/permissions";
import { deleteCustomer } from "../delete";

import type { CustomerListItem } from "../data";

type CustomersTableProps = {
  customers: CustomerListItem[];
  query?: string;
};

function typeLabel(type: CustomerListItem["type"]) {
  switch (type) {
    case "DEALER":
      return "Dealer";
    case "SUBDEALER":
      return "SubDealer";
    case "FARMER":
      return "Farmer";
  }
}

export function CustomersTable({ customers, query }: CustomersTableProps) {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { data: session } = useSession();
  const perms = session?.user?.permissions ?? [];
  const canView = hasPermission(perms, "customers", "view");
  const canEdit = hasPermission(perms, "customers", "edit");
  const canDelete = hasPermission(perms, "customers", "delete");
  const showActions = canView || canEdit || canDelete;

  const [deleteTarget, setDeleteTarget] = useState<CustomerListItem | null>(
    null
  );

  // Sorting & pagination like products table
  type Order = "asc" | "desc";
  type SortableKeys =
    | "type"
    | "name"
    | "phone"
    | "email"
    | "address"
    | "createdAt";

  const [order, setOrder] = useState<Order>("asc");
  const [orderBy, setOrderBy] = useState<SortableKeys>("createdAt");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const addressString = (c: CustomerListItem) =>
    [c.address, c.subdistrict, c.district, c.province, c.postalCode]
      .filter(Boolean)
      .join(" ");

  const descendingComparator = (
    a: CustomerListItem,
    b: CustomerListItem,
    key: SortableKeys
  ) => {
    const av = key === "address" ? addressString(a) : (a as any)[key];
    const bv = key === "address" ? addressString(b) : (b as any)[key];
    const as = String(av ?? "").toLowerCase();
    const bs = String(bv ?? "").toLowerCase();
    if (bs < as) return -1;
    if (bs > as) return 1;
    return 0;
  };
  const getComparator = (ord: Order, key: SortableKeys) =>
    ord === "asc"
      ? (a: CustomerListItem, b: CustomerListItem) =>
          descendingComparator(a, b, key)
      : (a: CustomerListItem, b: CustomerListItem) =>
          -descendingComparator(a, b, key);

  const headCells: {
    id: SortableKeys;
    label: string;
    width?: number;
    align?: "left" | "right" | "center";
  }[] = [
    { id: "type", label: "ประเภท", width: 100, align: "left" },
    { id: "name", label: "ชื่อลูกค้า", width: 240, align: "left" },
    { id: "phone", label: "เบอร์โทร", width: 140, align: "left" },
    { id: "email", label: "อีเมล", width: 200, align: "left" },
    { id: "address", label: "ที่อยู่", width: 360, align: "left" },
  ];

  const filtered = useMemo(() => {
    const q = (query ?? "").trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      [c.name, c.phone, c.email ?? "", c.type, addressString(c)]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [customers, query]);

  const handleRequestSort = (
    _: React.MouseEvent<unknown>,
    property: SortableKeys
  ) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const visibleRows = useMemo(
    () =>
      [...filtered]
        .sort(getComparator(order, orderBy))
        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filtered, order, orderBy, page, rowsPerPage]
  );

  return (
    // <Paper
    //   variant="outlined"
    //   sx={{
    //     p: { xs: 2, sm: 3 },
    //     borderRadius: 2,
    //     overflow: "hidden",
    //     borderColor: "#ddd",
    //   }}
    // >
      <Stack spacing={2}>
        {/* search is moved to parent Toolbar; table only renders data */}
        {isMobile ? (
          <Stack spacing={1.25} sx={{ p: 1.5 }}>
            {visibleRows.map((c) => {
              const address = [
                c.address,
                c.subdistrict,
                c.district,
                c.province,
                c.postalCode,
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <Paper
                  key={c.id}
                  variant="outlined"
                  sx={{ p: 1.25, borderRadius: 2 }}
                >
                  <Stack spacing={1}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography fontWeight={700}>{c.name}</Typography>
                      <Chip
                        size="small"
                        label={typeLabel(c.type)}
                        color={
                          c.type === "FARMER"
                            ? "success"
                            : c.type === "SUBDEALER"
                            ? "secondary"
                            : "primary"
                        }
                        variant="outlined"
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      โทร: {c.phone} {c.email ? `• อีเมล: ${c.email}` : ""}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {address || "-"}
                    </Typography>
                    {showActions && (
                      <Stack
                        direction="row"
                        spacing={0.5}
                        justifyContent="flex-end"
                      >
                        {canView && (
                          <Tooltip title="ดูรายละเอียด" arrow>
                            <IconButton
                              component={Link}
                              href={`/dashboard/customers/${c.id}`}
                              size="small"
                            >
                              <VisibilityOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {canEdit && (
                          <Tooltip title="แก้ไข" arrow>
                            <IconButton
                              component={Link}
                              href={`/dashboard/customers/${c.id}/edit`}
                              size="small"
                            >
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {canDelete && (
                          <Tooltip title="ลบ" arrow>
                            <IconButton
                              size="small"
                              onClick={() => setDeleteTarget(c)}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    )}
                  </Stack>
                </Paper>
              );
            })}
            {visibleRows.length === 0 && (
              <Typography color="text.secondary" align="center">
                ไม่พบข้อมูลลูกค้า
              </Typography>
            )}
          </Stack>
        ) : (
          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{ maxWidth: "100%", overflowX: "auto", borderRadius: 2 }}
          >
            <Table size="small" stickyHeader sx={{ minWidth: 960 }}>
              <TableHead
                sx={{
                  // "& .MuiTableCell-root" targets all cells inside the head
                  "& .MuiTableCell-root": {
                    backgroundColor: "#d9d9db", // เปลี่ยนสีพื้นหลังตามที่ต้องการ
                    color: "#212121", // เปลี่ยนสีตัวอักษรเป็นสีเข้มเพื่อให้อ่านง่าย
                    fontFamily: "Prompt, sans-serif",
                    fontSize: "1rem",
                    fontWeight: 900, // ปรับความหนาตัวอักษร
                    borderBottom: "none",
                    whiteSpace: "nowrap",
                    padding: "12px 16px",
                  },
                  // Target a specific cell to apply border-radius
                  "& .MuiTableCell-root:first-of-type": {
                    borderTopLeftRadius: "8px",
                    // borderBottomLeftRadius: "8px",
                  },
                  "& .MuiTableCell-root:last-of-type": {
                    borderTopRightRadius: "8px",
                    // borderBottomRightRadius: "8px",
                  },
                }}
              >
                {/* TableRow and TableCells go here as before */}
                <TableRow>
                  {headCells.map((h) => (
                    <TableCell
                      key={h.id}
                      align={h.align ?? "left"}
                      sx={{ width: h.width }}
                    >
                      <Tooltip title={`เรียงตาม ${h.label}`} arrow>
                        <TableSortLabel
                          active={orderBy === h.id}
                          direction={orderBy === h.id ? order : "asc"}
                          sx={{
                            color: "inherit !important",
                            "& .MuiTableSortLabel-icon": {
                              color: "inherit !important", // ไอคอนจะใช้สีเดียวกับตัวอักษร
                            },
                          }}
                          onClick={(e) => handleRequestSort(e, h.id)}
                        >
                          {h.label}
                        </TableSortLabel>
                      </Tooltip>
                    </TableCell>
                  ))}
                  {showActions && (
                    <TableCell align="center" sx={{ width: 140 }}>
                      การกระทำ
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleRows.map((c) => {
                  const address = [
                    c.address,
                    c.subdistrict,
                    c.district,
                    c.province,
                    c.postalCode,
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <TableRow key={c.id} hover>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Chip
                          size="small"
                          label={typeLabel(c.type)}
                          color={
                            c.type === "FARMER"
                              ? "success"
                              : c.type === "SUBDEALER"
                              ? "secondary"
                              : "primary"
                          }
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Link href={`/dashboard/customers/${c.id}`}>
                          {c.name}
                        </Link>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        {c.phone}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        {c.email || "-"}
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          noWrap
                        >
                          {address || "-"}
                        </Typography>
                      </TableCell>
                      {showActions && (
                        <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                          <Stack
                            direction="row"
                            justifyContent="center"
                            spacing={0.5}
                          >
                            {canView && (
                              <Tooltip title="ดูรายละเอียด" arrow>
                                <IconButton
                                  component={Link}
                                  href={`/dashboard/customers/${c.id}`}
                                  size="small"
                                >
                                  <VisibilityOutlinedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {canEdit && (
                              <Tooltip title="แก้ไข" arrow>
                                <IconButton
                                  component={Link}
                                  href={`/dashboard/customers/${c.id}/edit`}
                                  aria-label="edit"
                                  size="small"
                                >
                                  <EditOutlinedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {canDelete && (
                              <Tooltip title="ลบ" arrow>
                                <IconButton
                                  aria-label="delete"
                                  size="small"
                                  onClick={() => setDeleteTarget(c)}
                                >
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
                {visibleRows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={headCells.length + (showActions ? 1 : 0)}
                      align="center"
                    >
                      <Typography color="text.secondary">
                        ไม่พบข้อมูลลูกค้า
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filtered.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />

        <Dialog
          open={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
        >
          <DialogTitle>ลบลูกค้า</DialogTitle>
          <DialogContent>
            <DialogContentText>
              ยืนยันการลบ {deleteTarget?.name ?? "ลูกค้า"}?
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
                  await deleteCustomer(deleteTarget.id);
                  setDeleteTarget(null);
                  router.refresh();
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
      </Stack>
    // </Paper>
  );
}
