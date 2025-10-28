import { Box } from "@mui/material";
import QuotationsClient from "./_components/quotations-client";

export default function QuotationsPage() {
  return (
    <Box sx={{ p: { xs: 1.5, md: 2 } }}>
      <QuotationsClient />
    </Box>
  );
}
