import { notFound } from "next/navigation";
import { Box, Paper, Stack, Typography, Divider } from "@mui/material";
import { getProduct } from "../../data";
import InventoryClient from "./_components/inventory-client";

export default async function ProductInventoryPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const product = await getProduct(productId);
  if (!product) return notFound();

  return (
    <Box sx={{ display: "flex", justifyContent: "center", py: 4, px: { xs: 2, md: 0 } }}>
      <Stack spacing={3} sx={{ width: "100%", maxWidth: 1200 }}>
        <Paper sx={{ p: { xs: 2, md: 3 } }}>
          <Stack spacing={2}>
            <Typography variant="h5" fontWeight={800}>
              จัดการสต็อก/ล็อตสินค้า
            </Typography>
            <Divider />
            <InventoryClient
              product={{
                id: product.id,
                nameTH: product.nameTH,
                productCode: product.productCode,
                unit: product.unit ?? undefined,
                price: product.price ?? undefined,
              }}
              lots={(product.stocks || []).map((s: any) => ({
                id: s.id,
                lotNumber: s.lotNumber ?? "",
                qtyOnHand: s.qtyOnHand ?? 0,
                qtyReserved: s.qtyReserved ?? 0,
                importedAt: s.createdAt ? new Date(s.createdAt).toISOString().slice(0, 10) : "",
                expDate: s.expDate ? new Date(s.expDate).toISOString().slice(0, 10) : "",
                note: s.note ?? "",
              }))}
            />
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}
