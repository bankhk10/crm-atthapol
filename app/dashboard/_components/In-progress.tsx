"use client";

import { Stack, Typography, Box, Paper } from "@mui/material";
import ConstructionIcon from "@mui/icons-material/Construction";

export default function InProgressPage() {
  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "70vh",
          background: "linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)",
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: 4,
            textAlign: "center",
            maxWidth: 420,
          }}
        >
          <Stack spacing={2} alignItems="center">
            <ConstructionIcon
              sx={{
                fontSize: 64,
                color: "primary.main",
              }}
            />
            <Typography variant="h4" fontWeight={700} sx={{ color: "primary.main" }}>
              อยู่ระหว่างดำเนินการ
            </Typography>
            <Typography color="text.secondary">
              หน้านี้กำลังอยู่ระหว่างการปรับแต่งและพัฒนา
              <br />
              โปรดกลับมาอีกครั้งในภายหลัง
            </Typography>
          </Stack>
        </Paper>
      </Box>
    </>
  );
}
