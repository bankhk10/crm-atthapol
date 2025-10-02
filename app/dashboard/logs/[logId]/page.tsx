import { notFound } from "next/navigation";
import { Box, Chip, Divider, Paper, Stack, Typography } from "@mui/material";

import { getAuditLogById } from "../data";

export default async function AuditLogDetailPage({
  params,
}: {
  params: Promise<{ logId: string }>;
}) {
  const { logId } = await params;
  const log = await getAuditLogById(logId);
  if (!log) {
    notFound();
  }

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
        <Typography variant="h4" fontWeight={700} component="h1">
          รายละเอียดบันทึกการเปลี่ยนแปลง
        </Typography>

        <Paper sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <Info label="โมเดล" value={log.model} />
              <Info label="การกระทำ" value={<Chip label={log.action} variant="outlined" />} />
              <Info label="รหัสอ้างอิง" value={log.recordId ?? "-"} />
              <Info label="วันที่เวลา" value={log.performedAt.toLocaleString()} />
              <Info
                label="ผู้ใช้งาน"
                value={`${log.performedBy?.name ?? "-"} ${log.performedBy?.email ? `(${log.performedBy?.email})` : ""}`}
              />
            </Stack>

            <Divider sx={{ my: 1 }} />

            <Typography fontWeight={700}>ก่อนการเปลี่ยนแปลง</Typography>
            <CodeBlock value={log.before} />

            <Typography fontWeight={700}>หลังการเปลี่ยนแปลง</Typography>
            <CodeBlock value={log.after} />
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack spacing={0.25} sx={{ minWidth: 240 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      {typeof value === "string" || typeof value === "number" ? (
        <Typography fontWeight={600}>{value}</Typography>
      ) : (
        value
      )}
    </Stack>
  );
}

function CodeBlock({ value }: { value: unknown }) {
  const text = safeJSONStringify(value);
  return (
    <Box component="pre" sx={{ p: 2, bgcolor: "#f6f8fa", borderRadius: 1, overflow: "auto" }}>
      <code>{text}</code>
    </Box>
  );
}

function safeJSONStringify(input: unknown): string {
  try {
    if (input === null || input === undefined) return "-";
    return JSON.stringify(input, null, 2);
  } catch {
    return String(input);
  }
}

