"use client";

import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import SubdirectoryArrowRightIcon from "@mui/icons-material/SubdirectoryArrowRight";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import {
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
  Typography,
  TableSortLabel,
  TablePagination,
  Tooltip,
  Collapse,
  Box,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
// +++ เพิ่ม import +++
import { useSnackbar } from "notistack"; // สำหรับแสดง Error
import React, { useMemo, useState } from "react";

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
    case "BROKER":
      return "Broker";
  }
}

function CustomerRow(props: {
  customer: CustomerListItem;
  headCells: readonly any[];
  showActions: boolean;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  setDeleteTarget: (customer: CustomerListItem | null) => void;
}) {
  const { customer: c, headCells, showActions, canView, canEdit, canDelete, setDeleteTarget } = props;
  const [isOpen, setIsOpen] = useState(false);
  const hasBranches = c.type === "DEALER" && c.branches && c.branches.length > 0;
  const address = [c.address, c.subdistrict, c.district, c.province, c.postalCode]
    .filter(Boolean)
    .join(" ");

  const totalColumns = headCells.length + (showActions ? 1 : 0);

  return (
    <React.Fragment>
      {/* === แถวหลัก === */}
      <TableRow
        hover
        sx={{
          "&:nth-of-type(even)": { bgcolor: "#fafafa" },
          "&:hover": { bgcolor: "#f0f0f0" },
          "& > *": { borderBottom: "unset" },
        }}
      >
        {/* ชื่อลูกค้า (เพิ่มปุ่ม expand) */}
        <TableCell
          sx={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <IconButton
              aria-label="expand row"
              size="small"
              onClick={() => setIsOpen(!isOpen)}
              sx={{ visibility: hasBranches ? "visible" : "hidden" }}
            >
              {isOpen ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
            <Tooltip title={c.name} arrow>
              <span>{c.name}</span>
            </Tooltip>
          </Stack>
        </TableCell>
        {/* เบอร์โทร */}
        <TableCell
          sx={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          <Tooltip title={c.phone} arrow>
            <span>{c.phone}</span>
          </Tooltip>
        </TableCell>
        {/* อีเมล */}
        <TableCell
          sx={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          <Tooltip title={c.email || "-"} arrow>
            <span>{c.email || "-"}</span>
          </Tooltip>
        </TableCell>
        {/* ที่อยู่ */}
        <TableCell
          sx={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          <Tooltip title={address || "-"} arrow>
            <span>{address || "-"}</span>
          </Tooltip>
        </TableCell>
        {/* ประเภท */}
        <TableCell align="center">
          <Tooltip title={typeLabel(c.type)} arrow>
            <Chip
              size="small"
              label={typeLabel(c.type)}
              sx={{
                fontWeight: 600,
                px: 1.5,
                py: 2,
                borderRadius: "9999px",
                color: "#fff",
                bgcolor:
                  c.type === "FARMER"
                    ? "#11853bff"
                    : c.type === "SUBDEALER"
                      ? "#7C3AED"
                      : c.type === "BROKER"
                        ? "#F59E0B"
                        : "#3B82F6",
              }}
            />
          </Tooltip>
        </TableCell>
        {/* การกระทำ */}
        {showActions && (
          <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
            <Stack direction="row" justifyContent="center" spacing={0.5}>
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

      {/* === แถว Collapsible (ร้านรอง) === */}
      {hasBranches && (
        <TableRow>
          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={totalColumns}>
            <Collapse in={isOpen} timeout="auto" unmountOnExit>
              <Box sx={{ margin: 1, ml: 10, p: 2, bgcolor: "#fafafa", borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom component="div" sx={{ fontSize: "1rem", fontWeight: 600 }}>
                  ร้านรอง ({c.branches.length})
                </Typography>
                <Table size="small" aria-label="branches">
                  <TableHead>
                    <TableRow sx={{ "& .MuiTableCell-root": { fontWeight: "bold", border: "none" } }}>
                      <TableCell>ชื่อร้านรอง</TableCell>
                      <TableCell>เบอร์โทร</TableCell>
                      <TableCell align="right">การกระทำ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {c.branches.map((branch) => (
                      <TableRow key={branch.id} sx={{ "& .MuiTableCell-root": { border: "none" } }}>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <SubdirectoryArrowRightIcon fontSize="small" color="action" />
                            <span>{branch.name}</span>
                          </Stack>
                        </TableCell>
                        <TableCell>{branch.phone || "-"}</TableCell>
                        <TableCell align="right">
                          {canView && (
                            <Tooltip title="ดูรายละเอียด" arrow>
                              <IconButton
                                component={Link}
                                href={`/dashboard/customers/${branch.id}`}
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
                                href={`/dashboard/customers/${branch.id}/edit`}
                                size="small"
                              >
                                <EditOutlinedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </React.Fragment>
  );
}

export function CustomersTable({ customers, query }: CustomersTableProps) {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { data: session } = useSession();
  // +++ เพิ่ม +++
  const { enqueueSnackbar } = useSnackbar();

  const perms = session?.user?.permissions ?? [];
  const canView = hasPermission(perms, "customers", "view");
  const canEdit = hasPermission(perms, "customers", "edit");
  const canDelete = hasPermission(perms, "customers", "delete");
  const showActions = canView || canEdit || canDelete;

  const [deleteTarget, setDeleteTarget] = useState<CustomerListItem | null>(null);

  // Sorting & pagination
  type Order = "asc" | "desc";
  type SortableKeys = "type" | "name" | "phone" | "email" | "address" | "createdAt";

  const [order, setOrder] = useState<Order>("asc");
  const [orderBy, setOrderBy] = useState<SortableKeys>("createdAt");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const addressString = (c: CustomerListItem) =>
    [c.address, c.subdistrict, c.district, c.province, c.postalCode].filter(Boolean).join(" ");

  const descendingComparator = (a: CustomerListItem, b: CustomerListItem, key: SortableKeys) => {
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
      ? (a: CustomerListItem, b: CustomerListItem) => descendingComparator(a, b, key)
      : (a: CustomerListItem, b: CustomerListItem) => -descendingComparator(a, b, key);

  interface HeadCell {
    id: SortableKeys;
    label: string;
    width: number;
    align?: "left" | "right" | "center";
    numeric?: boolean;
    disablePadding?: boolean;
  }

  const headCells: readonly HeadCell[] = [
    { id: "name", label: "ชื่อลูกค้า", width: 240, align: "left" },
    { id: "phone", label: "เบอร์โทร", width: 140, align: "left" },
    { id: "email", label: "อีเมล", width: 200, align: "left" },
    { id: "address", label: "ที่อยู่", width: 320, align: "left" },
    { id: "type", label: "ประเภท", width: 150, align: "center" },
  ];

  const filtered = useMemo(() => {
    const q = (query ?? "").trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      [c.name, c.phone, c.email ?? "", c.type, addressString(c)]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [customers, query]);

  const handleRequestSort = (_: React.MouseEvent<unknown>, property: SortableKeys) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const visibleRows = useMemo(
    () =>
      [...filtered]
        .sort(getComparator(order, orderBy))
        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filtered, order, orderBy, page, rowsPerPage],
  );

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
      {/* ... (ส่วน Mobile View ไม่เปลี่ยนแปลง logic) ... */}
      {isMobile ? (
        <Stack spacing={1.25} sx={{ p: 1.5 }}>
          {visibleRows.map((c) => {
            const address = [c.address, c.subdistrict, c.district, c.province, c.postalCode]
              .filter(Boolean)
              .join(" ");
            const hasBranches = c.type === "DEALER" && c.branches && c.branches.length > 0;
            return (
              <Paper key={c.id} variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography fontWeight={700}>{c.name}</Typography>
                    <Chip
                      size="small"
                      label={typeLabel(c.type)}
                      sx={{
                        fontWeight: 600,
                        px: 1.2,
                        borderRadius: "9999px",
                        color: "#fff",
                        bgcolor:
                          c.type === "FARMER"
                            ? "#11853bff"
                            : c.type === "SUBDEALER"
                              ? "#7C3AED"
                              : c.type === "BROKER"
                                ? "#F59E0B"
                                : "#3B82F6",
                      }}
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    โทร: {c.phone} {c.email ? `• อีเมล: ${c.email}` : ""}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {address || "-"}
                  </Typography>

                  {/* Mobile branches view */}
                  {hasBranches && (
                    <Box sx={{ pt: 1, mt: 1, borderTop: "1px solid #eee" }}>
                      <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                        ร้านรอง ({c.branches.length}):
                      </Typography>
                      <Stack spacing={0.5} sx={{ pl: 2 }}>
                        {c.branches.map((branch) => (
                          <Stack
                            key={branch.id}
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                          >
                            <Typography variant="body2" color="text.secondary">
                              - {branch.name} ({branch.phone || "N/A"})
                            </Typography>
                            <Stack direction="row" spacing={0}>
                              {canView && (
                                <IconButton
                                  component={Link}
                                  href={`/dashboard/customers/${branch.id}`}
                                  size="small"
                                  sx={{ p: 0.5 }}
                                >
                                  <VisibilityOutlinedIcon fontSize="inherit" />
                                </IconButton>
                              )}
                              {canEdit && (
                                <IconButton
                                  component={Link}
                                  href={`/dashboard/customers/${branch.id}/edit`}
                                  size="small"
                                  sx={{ p: 0.5 }}
                                >
                                  <EditOutlinedIcon fontSize="inherit" />
                                </IconButton>
                              )}
                            </Stack>
                          </Stack>
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {/* Mobile actions */}
                  {showActions && (
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
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
                          <IconButton size="small" onClick={() => setDeleteTarget(c)}>
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
        // ... (ส่วน TableContainer, TableHead ไม่เปลี่ยนแปลง) ...
        <TableContainer
          sx={{
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
                          "& .MuiTableSortLabel-icon": {
                            color: "inherit !important",
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
              {visibleRows.map((c) => (
                <CustomerRow
                  key={c.id}
                  customer={c}
                  headCells={headCells}
                  showActions={showActions}
                  canView={canView}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  setDeleteTarget={setDeleteTarget}
                />
              ))}
              {visibleRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={headCells.length + (showActions ? 1 : 0)} align="center">
                    <Typography color="text.secondary">ไม่พบข้อมูลลูกค้า</Typography>
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

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>ลบลูกค้า</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ยืนยันการลบ {deleteTarget?.name ?? "ลูกค้า"}? การกระทำนี้ไม่สามารถย้อนกลับได้
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} color="inherit">
            ยกเลิก
          </Button>
          <Button
            // +++ แก้ไข Logic ใน onClick +++
            onClick={async () => {
              if (!deleteTarget) return;
              try {
                await deleteCustomer(deleteTarget.id);
                setDeleteTarget(null); // ปิด Dialog เมื่อลบสำเร็จ
                router.refresh();
                enqueueSnackbar("ลบลูกค้าสำเร็จ", { variant: "success" });
              } catch (e: any) {
                // ถ้า Error, ไม่ต้องปิด Dialog
                // และแสดง Error ที่โยนมาจาก Server Action
                const message = e.message || "เกิดข้อผิดพลาดในการลบ";
                enqueueSnackbar(message, { variant: "error" });
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