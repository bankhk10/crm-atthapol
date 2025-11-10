"use client";

import { TableCell, TableRow, Typography } from "@mui/material";

export type EmptyTableMessageProps = {
  colSpan: number;
  message: string;
};

/** Renders a standardized empty-state message for tables.
 *
 * Note: This component intentionally returns only the inner cell content (Typography).
 * When you need a full row, wrap this component in a <TableRow><TableCell colSpan=...>...
 */
export function EmptyTableMessage({ colSpan, message }: EmptyTableMessageProps) {
  return (
    <Typography textAlign="center" color="text.secondary" py={4}>
      {message}
    </Typography>
  );
}

export default EmptyTableMessage;
