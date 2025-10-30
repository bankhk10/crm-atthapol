"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Stack, Button, CircularProgress } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ButtonProps } from "@mui/material/Button";
import SaveIcon from "@mui/icons-material/Save";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

type CommonBtnProps = Omit<ButtonProps, "onClick"> & { sx?: SxProps<Theme> };

export type SaveBackButtonsProps = {
  onSave?: () => void | Promise<void>;
  onBack?: () => void;
  backHref?: string;
  isSaving?: boolean;
  disabled?: boolean;
  saveLabel?: string;
  backLabel?: string;
  justify?: "center" | "flex-start" | "flex-end";
  stackSx?: SxProps<Theme>;
  backButtonProps?: CommonBtnProps;
  saveButtonProps?: CommonBtnProps;
};

export function SaveBackButtons({
  onSave,
  onBack,
  backHref,
  isSaving,
  disabled,
  saveLabel = "บันทึก",
  backLabel = "ย้อนกลับ",
  justify = "center",
  stackSx,
  backButtonProps,
  saveButtonProps,
}: SaveBackButtonsProps) {
  const router = useRouter();

  const handleBack = useCallback(() => {
    if (disabled) return;
    if (onBack) return onBack();
    if (backHref) router.push(backHref);
  }, [disabled, onBack, backHref, router]);

  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent={justify} sx={stackSx}>
      <Button
        variant="contained"
        onClick={handleBack}
        disabled={disabled}
        startIcon={<ArrowBackIcon />}
        sx={{
          minWidth: 130,
          backgroundColor: "#8b8b8bff",
          color: "#fff",
          "&:hover": { backgroundColor: "#8a8585ff" },
          width: { xs: "100%", sm: "auto" },
          ...(backButtonProps?.sx as any),
        }}
        {...backButtonProps}
      >
        {backLabel}
      </Button>

      <Button
        variant="contained"
        color="success"
        onClick={onSave}
        disabled={disabled}
        startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
        sx={{ minWidth: 130, width: { xs: "100%", sm: "auto" }, ...(saveButtonProps?.sx as any) }}
        {...saveButtonProps}
      >
        {isSaving ? "กำลังบันทึก..." : saveLabel}
      </Button>
    </Stack>
  );
}

export type BackButtonProps = {
  href?: string;
  label?: string;
  disabled?: boolean;
} & CommonBtnProps;

export function BackButton({ href, label = "ย้อนกลับ", disabled, sx, ...rest }: BackButtonProps) {
  const router = useRouter();
  return (
    <Button
      variant="contained"
      onClick={() => {
        if (disabled) return;
        if (rest.onClick) return (rest.onClick as any)();
        if (href) router.push(href);
      }}
      disabled={disabled}
      startIcon={<ArrowBackIcon />}
      sx={{
        minWidth: 130,
        backgroundColor: "#8b8b8bff",
        color: "#fff",
        "&:hover": { backgroundColor: "#8a8585ff" },
        ...(sx as any),
      }}
      {...rest}
    >
      {label}
    </Button>
  );
}

export type SaveButtonProps = {
  onClick?: () => void | Promise<void>;
  label?: string;
  saving?: boolean;
  disabled?: boolean;
} & CommonBtnProps;

export function SaveButton({ onClick, label = "บันทึก", saving, disabled, sx, ...rest }: SaveButtonProps) {
  return (
    <Button
      variant="contained"
      color="success"
      onClick={onClick}
      disabled={disabled}
      startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
      sx={{ minWidth: 130, ...(sx as any) }}
      {...rest}
    >
      {saving ? "กำลังบันทึก..." : label}
    </Button>
  );
}

