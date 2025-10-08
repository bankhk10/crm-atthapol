import { Stack, Typography } from "@mui/material";
import { getProducts } from "./data";
import ProductsListClient from "./_components/products-list-client";

export default async function ProductsPage() {
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
