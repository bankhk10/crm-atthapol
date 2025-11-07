import { Stack, Typography } from "@mui/material";

import { requirePermission } from "@/lib/require-permission";

import ProductsListClient from "./_components/products-list-client";
import { getProducts } from "./data";

export default async function ProductsPage() {
  await requirePermission("products", "view");
  const products = await getProducts();

  return (
    <>
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={700}></Typography>
        <ProductsListClient products={products} />
      </Stack>
    </>
  );
}
