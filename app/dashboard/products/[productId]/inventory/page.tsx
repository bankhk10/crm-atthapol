import { Box, Paper, Stack, Typography, Divider } from "@mui/material";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

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

  // Load master data for location dropdown
  const locations = await prisma.warehouseLocation.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
  });

  return (
    <Box sx={{ display: "flex", justifyContent: "center", py: 4, px: { xs: 2, md: 0 } }}>
      <Stack spacing={3} sx={{ width: "100%", maxWidth: 1200 }}>
        <Paper sx={{ p: { xs: 2, md: 3 } }}>
          <Stack spacing={2}>
            <Typography variant="h4" fontWeight={800} textAlign="center">
              จัดการคลังสินค้าและราคา
            </Typography>
            <Divider />
            <InventoryClient
              product={{
                id: product.id,
                nameTH: product.nameTH,
                productCode: product.productCode,
                unit: product.unit ?? undefined,
                price: product.price ?? undefined,
                freebies: (product as any).freebies ?? null,
                promotionBudget: (product as any).promotionBudget ?? null,
                otherPromotion: (product as any).otherPromotion ?? null,
              }}
              lots={(product.stocks || []).map((s: any) => ({
                id: s.id,
                lotNumber: s.lotNumber ?? "",
                qtyOnHand: s.qtyOnHand ?? 0,
                qtyReserved: s.qtyReserved ?? 0,
                importedAt: s.createdAt ? new Date(s.createdAt).toISOString().slice(0, 10) : "",
                expDate: s.expDate ? new Date(s.expDate).toISOString().slice(0, 10) : "",
                warehouseId: s.warehouseId ?? undefined,
                locationId: s.locationId ?? undefined,
                warehouse: s.warehouse ?? "",
                storageLocation: s.storageLocation ?? "",
                note: s.note ?? "",
              }))}
              locations={locations.map((l) => ({
                id: l.id,
                name: l.name,
                warehouseId: l.warehouseId,
              }))}
            />
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}
