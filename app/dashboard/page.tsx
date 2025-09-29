import { getServerSession } from "next-auth";
import { Box, Typography, Paper, Stack } from "@mui/material";
import { authOptions } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const roleValue = ((session?.user ?? {}) as { role?: unknown }).role;
  const role = typeof roleValue === "string" ? roleValue : "USER";

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" fontWeight={700} mb={1}>
          Dashboard
        </Typography>
        <Typography color="text.secondary">
          จัดการข้อมูลภาพรวมของระบบได้จากเมนูด้านซ้ายมือ
        </Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Typography>
          สวัสดี {session?.user?.name ?? "ผู้ใช้"} (role: {role})
        </Typography>
      </Paper>
    </Stack>
  );
}
