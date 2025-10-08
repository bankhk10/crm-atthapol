import { Stack, Typography, Button } from "@mui/material";
import Link from "next/link";
import { ActionButtons } from "../_components/action-buttons";
import { getProducts } from "./data";
import { ProductsTable } from "./_components/products-table";

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <>
      {/* <ActionButtons resource="products" /> */}
      {/* ปุ่มเพิ่มสินค้า ย้ายไปข้างช่องค้นหาในตาราง */}
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={700}></Typography>
        <ProductsTable products={products} />
      </Stack>
    </>
  );
}
