"use client";

import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import { DEPARTMENTS } from "@/lib/departments";

import type { PermissionLibraryGroup, RoleFormValues } from "../types";
import type { ChangeEvent, FormEvent } from "react";

type RoleFormDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  initialValues: RoleFormValues;
  permissionLibrary: PermissionLibraryGroup[];
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: RoleFormValues) => void;
};

type PermissionDraft = RoleFormValues["permissions"][number];

const defaultFormValues: RoleFormValues = {
  key: "",
  name: "",
  description: "",
  department: "",
  permissions: [],
};

export function RoleFormDialog({
  open,
  mode,
  initialValues,
  permissionLibrary,
  submitting,
  error: externalError,
  onClose,
  onSubmit,
}: RoleFormDialogProps) {
  const [values, setValues] = useState<RoleFormValues>(defaultFormValues);
  const [dialogError, setDialogError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setDialogError(null);
    setValues({
      key: initialValues.key ?? "",
      name: initialValues.name ?? "",
      description: initialValues.description ?? "",
      department: initialValues.department ?? "",
      permissions: initialValues.permissions ?? [],
    });
  }, [initialValues, open]);

  const categoryOptions = useMemo(
    () => permissionLibrary.map((group) => group.category),
    [permissionLibrary],
  );

  const handleFieldChange =
    (field: keyof RoleFormValues) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleUpdatePermissionGroup = (
    index: number,
    updater: (draft: PermissionDraft) => PermissionDraft,
  ) => {
    setValues((prev) => {
      const draft = [...prev.permissions];
      draft[index] = updater(draft[index]);
      return { ...prev, permissions: draft };
    });
  };

  const handleAddPermissionGroup = () => {
    setValues((prev) => ({
      ...prev,
      permissions: [...prev.permissions, { category: "", items: [] }],
    }));
  };

  const handleRemovePermissionGroup = (index: number) => {
    setValues((prev) => ({
      ...prev,
      permissions: prev.permissions.filter((_, i) => i !== index),
    }));
  };

  const handlePermissionCategoryChange = (index: number, value: string) => {
    setValues((prev) => {
      const draft = [...prev.permissions];
      const currentGroup = draft[index];
      draft[index] = {
        ...currentGroup,
        category: value,
        items: currentGroup?.items || [],
      };
      return { ...prev, permissions: draft };
    });
  };

  const handlePermissionItemsChange = (index: number, items: string[]) => {
    // Deduplicate while preserving order
    const seen = new Set<string>();
    const next = [] as string[];
    for (const it of items) {
      const k = it.trim();
      if (!k) continue;
      const key = k.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      next.push(k);
    }
    handleUpdatePermissionGroup(index, (group) => ({ ...group, items: next }));
  };

  const removePermissionFromGroup = (index: number, item: string) => {
    handleUpdatePermissionGroup(index, (group) => ({
      ...group,
      items: group.items.filter((permission) => permission !== item),
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setDialogError(null);

    const payload: RoleFormValues = {
      key: values.key.trim().toUpperCase(),
      name: values.name.trim(),
      description: values.description.trim(),
      department: values.department?.trim() || undefined,
      permissions: values.permissions
        .map((group) => ({
          category: group.category.trim(),
          items: Array.from(new Set(group.items.map((item) => item.trim()))).filter(Boolean),
        }))
        .filter((group) => group.category && group.items.length > 0),
    };

    onSubmit(payload);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Stack spacing={0.5}>
          <Typography variant="h5" fontWeight={700}>
            {mode === "create" ? "สร้างบทบาทใหม่" : "แก้ไขบทบาท"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            กำหนดรายละเอียดและสิทธิ์ที่บทบาทนี้สามารถเข้าถึงได้
          </Typography>
        </Stack>
        <IconButton edge="end" onClick={onClose} aria-label="close" size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box component="form" id="role-form" onSubmit={handleSubmit}>
          <Stack spacing={3} py={1}>
            {(externalError || dialogError) && (
              <Alert severity="error">{dialogError || externalError}</Alert>
            )}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="รหัสบทบาท (Key)"
                value={values.key}
                onChange={handleFieldChange("key")}
                placeholder="เช่น SALES_MANAGER"
                fullWidth
                required
                disabled={submitting}
                inputProps={{ maxLength: 64, style: { textTransform: "uppercase" } }}
                helperText="ใช้ตัวอักษรภาษาอังกฤษและขีดล่างเพื่ออ้างอิงในระบบ"
              />
              <TextField
                label="ชื่อบทบาท"
                value={values.name}
                onChange={handleFieldChange("name")}
                placeholder="เช่น ผู้จัดการฝ่ายขาย"
                fullWidth
                required
                disabled={submitting}
              />
            </Stack>

            <TextField
              select
              label="แผนก (ถ้าต้องการจำกัด)"
              value={values.department}
              onChange={handleFieldChange("department") as any}
              fullWidth
              disabled={submitting}
              helperText="เว้นว่างหากบทบาทนี้ใช้ได้ทุกแผนก"
            >
              <MenuItem value="">ไม่กำหนด</MenuItem>
              {DEPARTMENTS.map((dep) => (
                <MenuItem key={dep} value={dep}>
                  {dep}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="รายละเอียดบทบาท"
              value={values.description}
              onChange={handleFieldChange("description")}
              placeholder="อธิบายหน้าที่หรือขอบเขตของบทบาทนี้"
              fullWidth
              multiline
              minRows={3}
              disabled={submitting}
            />

            <Stack spacing={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="h6" fontWeight={600}>
                  สิทธิ์การใช้งาน
                </Typography>
                <Button
                  startIcon={<AddIcon />}
                  variant="text"
                  onClick={handleAddPermissionGroup}
                  disabled={submitting}
                >
                  เพิ่มหมวดสิทธิ์
                </Button>
              </Stack>

              {values.permissions.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  ยังไม่ได้เพิ่มสิทธิ์สำหรับบทบาทนี้ คลิก “เพิ่มหมวดสิทธิ์” เพื่อเริ่มต้น
                </Typography>
              )}

              {values.permissions.map((group, index) => {
                const availableItems =
                  permissionLibrary.find(
                    (libraryGroup) =>
                      libraryGroup.category.toLowerCase() === group.category.trim().toLowerCase(),
                  )?.items ?? [];

                return (
                  <PermissionGroupSection
                    key={`permission-group-${index}`}
                    group={group}
                    index={index}
                    submitting={submitting}
                    categoryOptions={categoryOptions}
                    availableItems={availableItems}
                    onCategoryChange={handlePermissionCategoryChange}
                    onItemsChange={handlePermissionItemsChange}
                    onRemoveItem={removePermissionFromGroup}
                    onRemoveGroup={handleRemovePermissionGroup}
                  />
                );
              })}
            </Stack>
          </Stack>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={submitting}>
          ยกเลิก
        </Button>
        <Button type="submit" form="role-form" variant="contained" disabled={submitting}>
          {mode === "create" ? "บันทึกบทบาทใหม่" : "บันทึกการเปลี่ยนแปลง"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

type PermissionGroupSectionProps = {
  group: PermissionDraft;
  index: number;
  submitting: boolean;
  categoryOptions: string[];
  availableItems: string[];
  onCategoryChange: (index: number, value: string) => void;
  onItemsChange: (index: number, items: string[]) => void;
  onRemoveItem: (index: number, item: string) => void;
  onRemoveGroup: (index: number) => void;
};

function PermissionGroupSection({
  group,
  index,
  submitting,
  categoryOptions,
  availableItems,
  onCategoryChange,
  onItemsChange,
  onRemoveItem,
  onRemoveGroup,
}: PermissionGroupSectionProps) {
  return (
    <Stack spacing={2} sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 2 }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "flex-start" }}>
        <TextField
          select
          label="หมวดสิทธิ์"
          value={group.category}
          onChange={(event) => onCategoryChange(index, event.target.value)}
          fullWidth
          disabled={submitting}
          SelectProps={{
            displayEmpty: true,
          }}
        >
          <MenuItem value="" disabled>
            {/* <em>เลือกหมวดสิทธิ์</em> */}
          </MenuItem>
          {categoryOptions.map((category) => (
            <MenuItem key={category} value={category}>
              {category}
            </MenuItem>
          ))}
        </TextField>
        <Button
          startIcon={<RemoveCircleOutlineIcon />}
          color="error"
          variant="outlined"
          onClick={() => onRemoveGroup(index)}
          disabled={submitting}
        >
          ลบหมวดนี้
        </Button>
      </Stack>

      <Divider sx={{ mx: -2 }} />

      <Stack spacing={1.5}>
        <TextField
          select
          label="สิทธิ์ในหมวดนี้"
          value={group.items}
          onChange={(event) => {
            const value = event.target.value as string | string[];
            const next = Array.isArray(value) ? value : value.split(",");
            onItemsChange(index, next);
          }}
          placeholder="เลือกสิทธิ์"
          fullWidth
          disabled={submitting || !group.category.trim()}
          SelectProps={{ multiple: true }}
          helperText={
            availableItems.length > 0 ? `สิทธิ์ที่มีอยู่: ${availableItems.join(", ")}` : undefined
          }
        >
          {Array.from(new Set([...(availableItems || []), ...(group.items || [])])).map((item) => (
            <MenuItem key={item} value={item}>
              {item}
            </MenuItem>
          ))}
        </TextField>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {group.items.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              ยังไม่มีสิทธิ์ในหมวดนี้ เลือกจากรายการด้านบน
            </Typography>
          )}
          {group.items.map((item) => (
            <Chip
              key={item}
              label={item}
              onDelete={() => onRemoveItem(index, item)}
              disabled={submitting}
            />
          ))}
        </Stack>
      </Stack>
    </Stack>
  );
}
