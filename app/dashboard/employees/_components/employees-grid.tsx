"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SearchIcon from "@mui/icons-material/Search";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { hasPermission } from "@/lib/permissions";
import type { EmployeeListItem } from "../types";
import { deleteEmployee } from "../delete";

type EmployeesGridProps = {
  employees: EmployeeListItem[];
};

export function EmployeesGrid({ employees }: EmployeesGridProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const permissions = session?.user?.permissions ?? [];
  const canCreateEmployee = hasPermission(permissions, "employees", "create");
  const canEditEmployee = hasPermission(permissions, "employees", "edit");
  const canDeleteEmployee = hasPermission(permissions, "employees", "delete");
  const canViewEmployee = hasPermission(permissions, "employees", "view");

  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [deleteTarget, setDeleteTarget] = useState<EmployeeListItem | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) =>
      [e.employeeCode, e.name, e.email, e.position, e.department]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [employees, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const pageItems = filtered.slice(startIndex, startIndex + itemsPerPage);
  const startDisplay = filtered.length ? startIndex + 1 : 0;
  const endDisplay = Math.min(startIndex + itemsPerPage, filtered.length);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteEmployee(deleteTarget.id);
      setDeleteTarget(null);
      router.refresh();
    } catch (error) {
      console.error(error);
      setDeleteTarget(null);
    }
  };

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack spacing={3}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between">
          <Box sx={{ position: "relative", width: { xs: "100%", md: 360 } }}>
            <TextField
              fullWidth
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="ค้นหา"
              InputProps={{
                startAdornment: (
                  <SearchIcon fontSize="small" style={{ marginRight: 8 }} />
                ),
              }}
            />
          </Box>

          {canCreateEmployee && (
            <Button
              component={Link}
              href="/dashboard/employees/new"
              startIcon={<AddCircleOutlineIcon />}
              variant="contained"
              sx={{ alignSelf: { xs: "stretch", md: "center" } }}
            >
              เพิ่มพนักงาน
            </Button>
          )}
        </Stack>

        <Grid container spacing={2}>
          {pageItems.map((e) => (
            <Grid key={e.id} item xs={12} sm={6} md={4} lg={3}>
              <Paper sx={{ p: 2, borderRadius: 3, height: "100%" }} elevation={3}>
                <Stack spacing={2} alignItems="center">
                  <Box sx={{ width: "100%", background: "#568fd41a", borderRadius: 3, p: 2 }}>
                    <Stack direction="row" justifyContent="flex-end">
                      {canDeleteEmployee && (
                        <IconButton aria-label="delete" onClick={() => setDeleteTarget(e)}>
                          <DeleteOutlineIcon />
                        </IconButton>
                      )}
                    </Stack>

                    <Box sx={{ position: "relative", width: 96, height: 96, borderRadius: "50%", overflow: "hidden", mx: "auto", mt: -2 }}>
                      <Image src="/images/man-avatar.png" alt={e.name ?? "avatar"} fill style={{ objectFit: "cover" }} />
                    </Box>

                    <Typography variant="h6" fontWeight={700} align="center" mt={1}>
                      {e.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" align="center" mb={1.5}>
                      {e.position}
                    </Typography>

                    <Stack direction="row" spacing={1} justifyContent="center">
                      {canEditEmployee && (
                        <Button component={Link} href={`/dashboard/employees/${e.id}/edit`} size="small" variant="outlined" color="inherit">
                          แก้ไข
                        </Button>
                      )}
                      {canViewEmployee && (
                        <Button component={Link} href={`/dashboard/employees/${e.id}`} size="small" variant="outlined">
                          ประวัติ
                        </Button>
                      )}
                    </Stack>
                  </Box>

                  <Stack direction="row" justifyContent="space-around" width="100%" borderTop={1} borderColor="divider" pt={2}>
                    {[{ label: "ที่เหลือ" }, { label: "กำลังทำ" }, { label: "สำเร็จ" }].map((s, idx) => (
                      <Box key={s.label} textAlign="center">
                        <Typography fontWeight={700} variant="h6">{(e.id.charCodeAt(0) + idx * 7) % 50}</Typography>
                        <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">
            {startDisplay}-{endDisplay} จาก {filtered.length}
          </Typography>
          <Stack direction="row" spacing={1}>
            <IconButton disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}>
              <ChevronLeftIcon />
            </IconButton>
            <IconButton disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}>
              <ChevronRightIcon />
            </IconButton>
          </Stack>
        </Stack>

        <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
          <DialogTitle>ลบพนักงาน</DialogTitle>
          <DialogContent>
            <DialogContentText>
              ยืนยันการลบ {deleteTarget?.name ?? "ผู้ใช้งาน"}? การกระทำนี้ไม่สามารถย้อนกลับได้
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteTarget(null)} color="inherit">ยกเลิก</Button>
            <Button onClick={handleDelete} color="error" variant="contained" startIcon={<DeleteOutlineIcon />}>ลบ</Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Paper>
  );
}
