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
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/permissions";
import { deleteCustomer } from "../delete";

import type { CustomerListItem } from "../data";

type CustomersTableProps = {
  customers: CustomerListItem[];
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

export function CustomersTable({ customers }: CustomersTableProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const perms = session?.user?.permissions ?? [];
  const canView = hasPermission(perms, "customers", "view");
  const canEdit = hasPermission(perms, "customers", "edit");
  const canDelete = hasPermission(perms, "customers", "delete");

  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CustomerListItem | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      [
        c.name,
        c.phone,
        c.email ?? "",
        c.type,
        c.address ?? "",
        c.subdistrict ?? "",
        c.district ?? "",
        c.province ?? "",
        c.postalCode ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [customers, query]);

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack spacing={2}>
        <Box sx={{ position: "relative", width: { xs: "100%", md: 360 } }}>
          <TextField
            fullWidth
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหา"
            InputProps={{
              startAdornment: (
                <SearchIcon fontSize="small" style={{ marginRight: 8 }} />
              ),
            }}
          />
        </Box>

        <TableContainer component={Paper} variant="outlined" sx={{ maxWidth: "100%", overflowX: "auto" }}>
          <Table size="small" stickyHeader sx={{ minWidth: 840 }}>
            <TableHead>
              <TableRow>
                <TableCell>ประเภท</TableCell>
                <TableCell>ชื่อลูกค้า</TableCell>
                <TableCell>เบอร์โทร</TableCell>
                <TableCell>อีเมล</TableCell>
                <TableCell>ที่อยู่</TableCell>
                {(canView || canEdit || canDelete) && <TableCell align="right">การกระทำ</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((c) => {
                const address = [c.address, c.subdistrict, c.district, c.province, c.postalCode]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <TableRow key={c.id} hover>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      <Chip
                        size="small"
                        label={typeLabel(c.type)}
                        color={c.type === "FARMER" ? "success" : c.type === "SUBDEALER" ? "secondary" : "primary"}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{c.name}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{c.phone}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{c.email || "-"}</TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {address || "-"}
                      </Typography>
                    </TableCell>
                    {(canView || canEdit || canDelete) && (
                      <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                        {canView && (
                          <Button
                            component={Link}
                            href={`/dashboard/customers/${c.id}`}
                            size="small"
                            variant="outlined"
                            sx={{ mr: (canEdit || canDelete) ? 1 : 0 }}
                          >
                            ดูรายละเอียด
                          </Button>
                        )}
                        {canEdit && (
                          <IconButton
                            component={Link}
                            href={`/dashboard/customers/${c.id}/edit`}
                            aria-label="edit"
                            size="small"
                          >
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        )}
                        {canDelete && (
                          <IconButton aria-label="delete" size="small" onClick={() => setDeleteTarget(c)}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="text.secondary">ไม่พบข้อมูลลูกค้า</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

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
    </Paper>
  );
}
