"use client";

import { useMemo, type ReactNode } from "react";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import type { ButtonProps } from "@mui/material/Button";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import { useSession } from "next-auth/react";

import {
  ACTION_LABELS,
  PERMISSION_ACTIONS,
  hasPermission,
  type PermissionAction,
} from "@/lib/permissions";

type ActionButtonsProps = {
  resource: string;
};

const ACTION_CONFIG: Record<PermissionAction, {
  color: ButtonProps["color"];
  variant: ButtonProps["variant"];
  icon: ReactNode;
}> = {
  view: {
    color: "primary",
    variant: "outlined",
    icon: <VisibilityOutlinedIcon fontSize="small" />, 
  },
  create: {
    color: "primary",
    variant: "contained",
    icon: <AddCircleOutlineIcon fontSize="small" />,
  },
  edit: {
    color: "secondary",
    variant: "outlined",
    icon: <EditOutlinedIcon fontSize="small" />,
  },
  delete: {
    color: "error",
    variant: "outlined",
    icon: <DeleteOutlineIcon fontSize="small" />,
  },
  approve: {
    color: "success",
    variant: "contained",
    icon: <CheckCircleOutlineIcon fontSize="small" />,
  },
  reject: {
    color: "warning",
    variant: "outlined",
    icon: <CancelOutlinedIcon fontSize="small" />,
  },
};

export function ActionButtons({ resource }: ActionButtonsProps) {
  const { data: session } = useSession();

  const availableActions = useMemo(
    () =>
      PERMISSION_ACTIONS.filter((action) =>
        hasPermission(session?.user?.permissions, resource, action),
      ),
    [session?.user?.permissions, resource],
  );

  if (availableActions.length === 0) {
    return null;
  }

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1}
      justifyContent={{ xs: "flex-start", sm: "flex-end" }}
      alignItems={{ xs: "stretch", sm: "center" }}
    >
      {availableActions.map((action) => {
        const config = ACTION_CONFIG[action];
        return (
          <Button
            key={action}
            variant={config.variant}
            color={config.color}
            startIcon={config.icon}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            {ACTION_LABELS[action]}
          </Button>
        );
      })}
    </Stack>
  );
}
