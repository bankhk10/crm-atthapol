import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Box, Typography, Paper, Stack, Button } from "@mui/material";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight={700} mb={2}>Dashboard</Typography>
      <Paper sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography>
            สวัสดี {session.user?.name ?? "ผู้ใช้"} (role: {(session.user as any).role ?? "USER"})
          </Typography>
          <form action="/api/auth/signout" method="post">
            <Button type="submit" variant="outlined">ออกจากระบบ</Button>
          </form>
        </Stack>
      </Paper>
    </Box>
  );
}
