"use client";

import { useMemo, useState, useTransition } from "react";
import AddIcon from "@mui/icons-material/Add";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import {
  Box,
  Button,
  Chip,
  Divider,
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
import { useRouter } from "next/navigation";

import { createRole, updateRole } from "../actions";
import type { PermissionLibraryGroup, RoleFormValues, RoleListItem } from "../types";
import { RoleFormDialog } from "./role-form-dialog";

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
  permissions: [],
};

export function RolesClient({ roles, permissionLibrary }: RolesClientProps) {
  const router = useRouter();
  const [dialogState, setDialogState] = useState<DialogState>(initialDialogState);
  const [isPending, startTransition] = useTransition();

  const totalUniquePermissions = useMemo(() => {
    const unique = new Set<string>();
    permissionLibrary.forEach((group) => {
      group.items.forEach((item) => unique.add(`${group.category}::${item}`));
    });
    return unique.size;
  }, [permissionLibrary]);

  const handleOpenCreate = () => {
    setDialogState({ mode: "create", open: true, role: null, error: null });
  };

  const handleOpenEdit = (role: RoleListItem) => {
    setDialogState({ mode: "edit", open: true, role, error: null });
  };

  const handleCloseDialog = () => {
    if (isPending) return;
    setDialogState((prev) => ({ ...prev, open: false }));
  };

  const handleSubmit = (values: RoleFormValues) => {
    startTransition(() => {
      (async () => {
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
        }
      })();
    });
  };

  const dialogInitialValues = useMemo(() => {
    if (dialogState.role) {
      return {
        key: dialogState.role.key,
        name: dialogState.role.name,
        description: dialogState.role.description ?? "",
        permissions: dialogState.role.permissions,
      } satisfies RoleFormValues;
    }

    return emptyForm;
  }, [dialogState.role]);

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
        <Button
          variant="contained"
          size="large"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
        >
          สร้างบทบาทใหม่
        </Button>
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
                  ระบบมีบทบาททั้งหมด {roles.length} บทบาท และสิทธิ์ไม่ซ้ำกัน {totalUniquePermissions} รายการ
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
              <TableRow key={role.id} hover>
                <TableCell sx={{ whiteSpace: "nowrap" }}>
                  <Stack spacing={0.5}>
                    <Typography fontWeight={600}>{role.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      KEY: {role.key}
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
                    <Stack spacing={2} divider={<Divider flexItem />}>
                      {role.permissions.map((group) => (
                        <Stack key={group.category} spacing={1}>
                          <Typography fontWeight={600}>{group.category}</Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {group.items.map((item) => (
                              <Chip key={item} label={item} size="small" />
                            ))}
                          </Stack>
                        </Stack>
                      ))}
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
                  <Button
                    startIcon={<EditOutlinedIcon />}
                    variant="text"
                    onClick={() => handleOpenEdit(role)}
                  >
                    แก้ไขบทบาท
                  </Button>
                </TableCell>
              </TableRow>
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
        submitting={isPending}
        error={dialogState.error}
        onClose={handleCloseDialog}
        onSubmit={handleSubmit}
      />
    </Stack>
  );
}