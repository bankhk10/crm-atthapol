"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMemo, useState, Fragment } from "react";

import { hasPermission } from "@/lib/permissions";

import { deleteRole } from "../delete";
import { RoleFormDialog } from "./role-form-dialog";
import { createRole, updateRole } from "../actions";

import type { PermissionLibraryGroup, RoleFormValues, RoleListItem } from "../types";

type RolesClientProps = {
  roles: RoleListItem[];
  permissionLibrary: PermissionLibraryGroup[];
};

type DialogState = {
  mode: "create" | "edit";
  open: boolean;
  role: RoleListItem | null;
  error: string | null;
};

const initialDialogState: DialogState = {
  mode: "create",
  open: false,
  role: null,
  error: null,
};

const emptyForm: RoleFormValues = {
  key: "",
  name: "",
  description: "",
  department: "",
  permissions: [],
};

export function RolesClient({ roles, permissionLibrary }: RolesClientProps) {
  const router = useRouter();
  const [dialogState, setDialogState] = useState<DialogState>(initialDialogState);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RoleListItem | null>(null);
  const [openRoleIds, setOpenRoleIds] = useState<Set<string>>(new Set());
  const { data: session } = useSession();
  const permissions = session?.user?.permissions ?? [];
  const canCreateRole = hasPermission(permissions, "roles", "create");
  const canEditRole = hasPermission(permissions, "roles", "edit");
  const canDeleteRole = hasPermission(permissions, "roles", "delete");

  const totalUniquePermissions = useMemo(() => {
    const unique = new Set<string>();
    permissionLibrary.forEach((group) => {
      group.items.forEach((item) => unique.add(`${group.category}::${item}`));
    });
    return unique.size;
  }, [permissionLibrary]);

  const handleOpenCreate = () => {
    if (!canCreateRole) {
      return;
    }
    setDialogState({ mode: "create", open: true, role: null, error: null });
  };

  const handleOpenEdit = (role: RoleListItem) => {
    if (!canEditRole) {
      return;
    }
    setDialogState({ mode: "edit", open: true, role, error: null });
  };

  const handleCloseDialog = () => {
    if (isSaving) return;
    setDialogState((prev) => ({ ...prev, open: false }));
  };

  const handleSubmit = async (values: RoleFormValues) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (dialogState.mode === "create") {
        await createRole(values);
      } else if (dialogState.role) {
        await updateRole(dialogState.role.id, values);
      }

      setDialogState((prev) => ({ ...prev, open: false, error: null }));
      router.refresh();
    } catch (error) {
      setDialogState((prev) => ({
        ...prev,
        error:
          error instanceof Error
            ? error.message
            : "เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง",
      }));
    } finally {
      setIsSaving(false);
    }
  };

  const dialogInitialValues = useMemo(() => {
    if (dialogState.role) {
      return {
        key: dialogState.role.key,
        name: dialogState.role.name,
        description: dialogState.role.description ?? "",
        department: dialogState.role.department ?? "",
        permissions: dialogState.role.permissions,
      } satisfies RoleFormValues;
    }

    return emptyForm;
  }, [dialogState.role]);

  const toggleOpen = (roleId: string) => {
    setOpenRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  };

  const getPermissionCounts = (role: RoleListItem) => {
    const categories = role.permissions.length;
    const items = role.permissions.reduce((sum, g) => sum + g.items.length, 0);
    return { categories, items };
  };

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems={{ xs: "flex-start", md: "center" }}
        justifyContent="space-between"
      >
        <Box>
          <Typography variant="h4" fontWeight={700} mb={0.5}>
            บทบาทและสิทธิ์การใช้งาน
          </Typography>
          <Typography color="text.secondary">
            ตรวจสอบและกำหนดบทบาทของทีม พร้อมปรับสิทธิ์การเข้าถึงในที่เดียว
          </Typography>
        </Box>
        {canCreateRole && (
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
          >
            สร้างบทบาทใหม่
          </Button>
        )}
      </Stack>

      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={3}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
            <Stack direction="row" spacing={2} flex={1}>
              <Box
                sx={{
                  bgcolor: "primary.light",
                  color: "primary.contrastText",
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ShieldOutlinedIcon />
              </Box>
              <Stack spacing={0.5}>
                <Typography variant="h6" fontWeight={600}>
                  ภาพรวมสิทธิ์การใช้งาน
                </Typography>
                <Typography color="text.secondary">
                  ระบบมีบทบาททั้งหมด {roles.length} บทบาท และสิทธิ์ไม่ซ้ำกัน{" "}
                  {totalUniquePermissions} รายการ
                </Typography>
              </Stack>
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center" flex={1}>
              <TaskAltOutlinedIcon color="success" />
              <Typography color="text.secondary">
                สร้างบทบาทเพื่อควบคุมการเข้าถึงตามหน้าที่ เช่น ทีมขาย การตลาด หรือสนับสนุนลูกค้า
              </Typography>
            </Stack>
          </Stack>

          {permissionLibrary.length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {permissionLibrary.map((group) => (
                <Chip
                  key={group.category}
                  label={`${group.category} (${group.items.length})`}
                  variant="outlined"
                />
              ))}
            </Stack>
          )}
        </Stack>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>บทบาท</TableCell>
              <TableCell>รายละเอียด</TableCell>
              <TableCell>สิทธิ์ที่ได้รับ</TableCell>
              <TableCell align="center">จำนวนผู้ใช้</TableCell>
              <TableCell align="right">การจัดการ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {roles.map((role) => (
              <Fragment key={role.id}>
                <TableRow hover sx={{ "& > *": { borderBottom: "unset" } }}>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    <Stack spacing={0.5}>
                      <Typography fontWeight={600}>{role.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        KEY: {role.key}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        แผนก: {role.department ? role.department : "ทั้งหมด"}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography color="text.secondary">
                      {role.description || "ยังไม่มีรายละเอียด"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {role.permissions.length === 0 ? (
                      <Typography color="text.secondary" variant="body2">
                        ยังไม่มีการกำหนดสิทธิ์สำหรับบทบาทนี้
                      </Typography>
                    ) : (
                      <Stack direction="row" spacing={1} alignItems="center">
                        {(() => {
                          const { categories, items } = getPermissionCounts(role);
                          return (
                            <Chip label={`หมวด ${categories} / รายการ ${items}`} size="small" />
                          );
                        })()}
                        <Tooltip
                          title={openRoleIds.has(role.id) ? "ซ่อนสิทธิ์" : "ดูสิทธิ์ทั้งหมด"}
                        >
                          <IconButton size="small" onClick={() => toggleOpen(role.id)}>
                            {openRoleIds.has(role.id) ? (
                              <KeyboardArrowUpIcon fontSize="small" />
                            ) : (
                              <KeyboardArrowDownIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Typography fontWeight={600}>{role.assignedUsers}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      ผู้ใช้ที่เชื่อมบทบาทนี้
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      {canEditRole && (
                        <Button
                          startIcon={<EditOutlinedIcon />}
                          variant="text"
                          onClick={() => handleOpenEdit(role)}
                        >
                          แก้ไขบทบาท
                        </Button>
                      )}
                      {canDeleteRole && (
                        <Button
                          startIcon={<DeleteOutlineIcon />}
                          color="error"
                          variant="text"
                          onClick={() => setDeleteTarget(role)}
                          disabled={role.assignedUsers > 0}
                        >
                          ลบบทบาท
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
                {role.permissions.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ py: 0, bgcolor: "#fafafa" }}>
                      <Collapse in={openRoleIds.has(role.id)} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 2 }}>
                          <Stack spacing={2}>
                            {role.permissions.map((group) => (
                              <Stack key={`${role.id}-${group.category}`} spacing={1}>
                                <Typography fontWeight={700}>{group.category}</Typography>
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                  {group.items.map((item) => (
                                    <Chip
                                      key={`${role.id}-${group.category}-${item}`}
                                      label={item}
                                      size="small"
                                    />
                                  ))}
                                </Stack>
                              </Stack>
                            ))}
                          </Stack>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
            {roles.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography textAlign="center" color="text.secondary" py={4}>
                    ยังไม่มีบทบาทในระบบ คลิก “สร้างบทบาทใหม่” เพื่อเริ่มต้น
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <RoleFormDialog
        open={dialogState.open}
        mode={dialogState.mode}
        initialValues={dialogInitialValues}
        permissionLibrary={permissionLibrary}
        submitting={isSaving}
        error={dialogState.error}
        onClose={handleCloseDialog}
        onSubmit={handleSubmit}
      />

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>ลบบทบาท</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ยืนยันการลบ {deleteTarget?.name ?? "บทบาท"}? การกระทำนี้ไม่สามารถย้อนกลับได้
          </DialogContentText>
          {deleteTarget?.assignedUsers && deleteTarget.assignedUsers > 0 && (
            <DialogContentText color="error">
              ไม่สามารถลบได้ เนื่องจากมีผู้ใช้ {deleteTarget.assignedUsers} คนกำลังใช้งานบทบาทนี้
            </DialogContentText>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} color="inherit">
            ยกเลิก
          </Button>
          <Button
            onClick={async () => {
              if (!deleteTarget) return;
              try {
                await deleteRole(deleteTarget.id);
                setDeleteTarget(null);
                router.refresh();
              } catch (e) {
                setDeleteTarget(null);
              }
            }}
            color="error"
            variant="contained"
            startIcon={<DeleteOutlineIcon />}
            disabled={Boolean(deleteTarget?.assignedUsers && deleteTarget.assignedUsers > 0)}
          >
            ลบ
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
