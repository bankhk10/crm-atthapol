import { LogsTable } from "./_components/logs-table";
import { getAuditLogsPage, type AuditLogFilters } from "./data";
import type { AuditLogListItem } from "./types";
import { ActionButtons } from "../_components/action-buttons";
import { Box, Stack } from "@mui/material";

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters: AuditLogFilters = {
    q: asString(sp.q),
    model: asString(sp.model),
    action: asString(sp.action),
    userId: asString(sp.userId),
    startDate: asString(sp.startDate),
    endDate: asString(sp.endDate),
  };

  const page = asInt(sp.page, 1);
  const pageSize = asInt(sp.pageSize, 20);
  const { rows, total } = await getAuditLogsPage(filters, page, pageSize);

  const items: AuditLogListItem[] = rows.map((log) => ({
    id: log.id,
    model: log.model,
    action: log.action as AuditLogListItem["action"],
    recordId: log.recordId ?? undefined,
    performedAt: log.performedAt.toISOString(),
    performedById: log.performedBy?.id ?? null,
    performedByName: log.performedBy?.name ?? null,
    performedByEmail: log.performedBy?.email ?? null,
  }));

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 4,
      }}
    >
      <Stack spacing={3} sx={{ width: "100%", maxWidth: 1200 }}>
        <ActionButtons resource="logs" />
        <LogsTable logs={items} total={total} page={page} pageSize={pageSize} />
      </Stack>
    </Box>
  );
}

function asString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function asInt(v: string | string[] | undefined, def: number): number {
  const s = Array.isArray(v) ? v[0] : v;
  const n = s ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : def;
}
