"use client";

import { TableCell, TableRow, Typography } from "@mui/material";

export type EmptyTableMessageProps = {
  colSpan: number;
  message: string;
};

/** Renders a standardized empty-state row inside MUI TableBody. */
export function EmptyTableMessage({ colSpan, message }: EmptyTableMessageProps) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan}>
        <Typography textAlign="center" color="text.secondary" py={4}>
          {message}
        </Typography>
      </TableCell>
    </TableRow>
  );
}

export default EmptyTableMessage;
