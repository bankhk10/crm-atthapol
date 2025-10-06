import { Box, Stack } from "@mui/material";
import { ProductCreateClient } from "../_components/product-create-client";

export default function ProductCreatePage() {
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 4 }}>
      <Stack spacing={3} sx={{ width: "100%", maxWidth: 960 }}>
        <ProductCreateClient />
      </Stack>
    </Box>
  );
}

