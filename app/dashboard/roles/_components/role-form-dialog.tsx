"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
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
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import type { PermissionLibraryGroup, RoleFormValues } from "../types";

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
  permissions: [],
};

export function RoleFormDialog({
  open,
  mode,
  initialValues,
  permissionLibrary,
  submitting,
  error,
  onClose,
  onSubmit,
}: RoleFormDialogProps) {
  const [values, setValues] = useState<RoleFormValues>(defaultFormValues);
  const [permissionInputs, setPermissionInputs] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setValues({
      key: initialValues.key ?? "",
      name: initialValues.name ?? "",
      description: initialValues.description ?? "",
      permissions: initialValues.permissions ?? [],
    });

    setPermissionInputs(initialValues.permissions?.map(() => "") ?? []);
  }, [initialValues, open]);

  const categoryOptions = useMemo(
    () => permissionLibrary.map((group) => group.category),
    [permissionLibrary],
  );

  const handleFieldChange = (field: keyof RoleFormValues) =>
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
    setPermissionInputs((prev) => [...prev, ""]);
  };

  const handleRemovePermissionGroup = (index: number) => {
    setValues((prev) => ({
      ...prev,
      permissions: prev.permissions.filter((_, i) => i !== index),
    }));
    setPermissionInputs((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePermissionCategoryChange = (
    index: number,
    value: string,
  ) => {
    const trimmed = value.trim();
    const matchedLibraryGroup = permissionLibrary.find(
      (libraryGroup) => libraryGroup.category.toLowerCase() === trimmed.toLowerCase(),
    );

    handleUpdatePermissionGroup(index, (group) => {
      const existingItems = Array.from(new Set((group.items ?? []).map((item) => item.trim())));
      const nextItems = matchedLibraryGroup
        ? Array.from(
            new Set([
              ...existingItems,
              ...matchedLibraryGroup.items.map((item) => item.trim()),
            ]),
          )
        : existingItems;

      return {
        ...group,
        category: value,
        items: nextItems,
      };
    });

    if (matchedLibraryGroup) {
      setPermissionInputs((prev) => {
        const draft = [...prev];
        draft[index] = "";
        return draft;
      });
    }
  };

  const handlePermissionInputChange = (index: number, value: string) => {
    setPermissionInputs((prev) => {
      const draft = [...prev];
      draft[index] = value;
      return draft;
    });
  };

  const addPermissionToGroup = (index: number) => {
    const rawValue = (permissionInputs[index] ?? "").trim();
    if (!rawValue) return;

    handleUpdatePermissionGroup(index, (group) => {
      const existing = new Set(group.items.map((item) => item.trim().toLowerCase()));
      if (existing.has(rawValue.toLowerCase())) {
        return group;
      }

      return {
        ...group,
        items: [...group.items, rawValue],
      };
    });

    handlePermissionInputChange(index, "");
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

    const payload: RoleFormValues = {
      key: values.key.trim().toUpperCase(),
      name: values.name.trim(),
      description: values.description.trim(),
      permissions: (values.permissions ?? [])
        .map((group) => ({
          category: group.category.trim(),
          items: Array.from(new Set(group.items.map((item) => item.trim()))).filter(
            Boolean,
          ),
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
            {error && (
              <Alert severity="error">
                {error}
              </Alert>
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
                const availableItems = permissionLibrary
                  .find((libraryGroup) =>
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
                    inputValue={permissionInputs[index] ?? ""}
                    onCategoryChange={handlePermissionCategoryChange}
                    onInputChange={handlePermissionInputChange}
                    onAddItem={addPermissionToGroup}
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
  inputValue: string;
  onCategoryChange: (index: number, value: string) => void;
  onInputChange: (index: number, value: string) => void;
  onAddItem: (index: number) => void;
  onRemoveItem: (index: number, item: string) => void;
  onRemoveGroup: (index: number) => void;
};

function PermissionGroupSection({
  group,
  index,
  submitting,
  categoryOptions,
  availableItems,
  inputValue,
  onCategoryChange,
  onInputChange,
  onAddItem,
  onRemoveItem,
  onRemoveGroup,
}: PermissionGroupSectionProps) {
  return (
    <Stack spacing={2} sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 2 }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "flex-start" }}>
        <TextField
          label="หมวดสิทธิ์"
          value={group.category}
          onChange={(event) => onCategoryChange(index, event.target.value)}
          placeholder="เช่น การจัดการผู้ใช้"
          fullWidth
          disabled={submitting}
          helperText={
            categoryOptions.length > 0
              ? `หมวดที่มีอยู่: ${categoryOptions.join(", ")}`
              : undefined
          }
        />
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
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField
            label="เพิ่มสิทธิ์ในหมวดนี้"
            value={inputValue}
            onChange={(event) => onInputChange(index, event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onAddItem(index);
              }
            }}
            placeholder="เช่น สร้างผู้ใช้"
            fullWidth
            disabled={submitting}
            helperText={
              availableItems.length > 0
                ? `สิทธิ์ที่มีอยู่: ${availableItems.join(", ")}`
                : undefined
            }
          />
          <Button
            variant="outlined"
            onClick={() => onAddItem(index)}
            disabled={submitting}
            sx={{ flexShrink: 0 }}
          >
            เพิ่มสิทธิ์
          </Button>
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {group.items.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              ยังไม่มีสิทธิ์ในหมวดนี้ เพิ่มสิทธิ์ใหม่ได้จากด้านบน
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