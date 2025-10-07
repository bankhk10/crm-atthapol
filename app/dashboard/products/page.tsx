import { Stack, Typography, Button } from "@mui/material";
import Link from "next/link";
import { ActionButtons } from "../_components/action-buttons";
import { getProducts } from "./data";
import { ProductsTable } from "./_components/products-table";

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <>
      <ActionButtons resource="products" />
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        justifyContent={{ xs: "flex-start", sm: "flex-end" }}
        sx={{ mb: 1 }}
      >
        <Button
          component={Link}
          href="/dashboard/products/new"
          variant="contained"
          color="primary"
        >
          เพิ่มสินค้า
        </Button>
      </Stack>
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={700}></Typography>
        <ProductsTable products={products} />
      </Stack>
    </>
  );
}
