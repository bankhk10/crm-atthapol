import { Box, Stack } from "@mui/material";
import { ProductCreateClient } from "../_components/product-create-client";
import { prisma } from "@/lib/prisma";

export default async function ProductCreatePage() {
  const plants = await prisma.plant.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 4 }}>
      <Stack spacing={3} sx={{ width: "100%", maxWidth: 960 }}>
        <ProductCreateClient plants={plants} />
      </Stack>
    </Box>
  );
}

