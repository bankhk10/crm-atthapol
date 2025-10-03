import { Box, Stack } from "@mui/material";
import { CustomerCreateClient } from "../_components/customer-create-client";

export default function CustomerCreatePage() {
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
      <Stack spacing={3} sx={{ width: "100%", maxWidth: 960 }}>
        <CustomerCreateClient />
      </Stack>
    </Box>
  );
}

