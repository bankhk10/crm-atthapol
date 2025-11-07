import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import Link from "next/link";

export const metadata = {
  title: "403 Forbidden",
};

export default function ForbiddenPage() {
  return (
    <Box
      sx={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 3,
      }}
    >
      <Paper elevation={0} sx={{ p: 4, maxWidth: 560, textAlign: "center" }}>
        <Typography variant="h3" fontWeight={800} gutterBottom>
          403
        </Typography>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          ไม่มีสิทธิ์เข้าถึงหน้านี้
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          คุณไม่มีสิทธิ์ที่เพียงพอในการเข้าถึงเนื้อหานี้ หากต้องการเข้าถึง โปรดติดต่อผู้ดูแลระบบ
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center">
          <Button component={Link} href="/dashboard" variant="contained">
            กลับไปหน้าแรก
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
