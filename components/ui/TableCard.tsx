"use client";

import { Paper, TableContainer } from "@mui/material";

import type { PropsWithChildren } from "react";

/**
 * Simple wrapper for MUI TableContainer with consistent styling.
 */
export function TableCard({ children }: PropsWithChildren) {
  return (
    <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
      {children}
    </TableContainer>
  );
}

export default TableCard;
