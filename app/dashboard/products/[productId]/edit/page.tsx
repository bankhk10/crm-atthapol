import { Box, Stack } from "@mui/material";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductEditClient } from "../../_components/product-edit-client";
import type { ProductFormValues } from "../../validation";

export default async function ProductEditPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;

  const p = await prisma.product.findUnique({ where: { id: productId } , include: { stocks: { orderBy: { updatedAt: "desc" }, take: 1 } } });
  if (!p) return notFound();

  const latest = p.stocks?.[0] ?? null;

  const initialValues: ProductFormValues = {
    productCode: p.productCode,
    lotNumber: p.lotNumber ?? "",
    nameTH: p.nameTH,
    nameEN: p.nameEN ?? "",
    category: p.category,
    brand: (p.brand as any) || "A",
    unit: (p.unit as any) || "ชิ้น",
    price: p.price ?? undefined,
    mfgDate: p.mfgDate ? new Date(p.mfgDate).toISOString().slice(0,10) : undefined,
    expDate: p.expDate ? new Date(p.expDate).toISOString().slice(0,10) : undefined,
    status: p.status as any,
    imageUrl: p.imageUrl ?? "",
    description: p.description ?? "",
    qtyOnHand: latest?.qtyOnHand ?? 0,
    qtyReserved: latest?.qtyReserved ?? 0,
    qtyVirtual: latest?.qtyVirtual ?? 0,
    stockNote: latest?.note ?? "",
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 4 }}>
      <Stack spacing={3} sx={{ width: "100%", maxWidth: 960 }}>
        <ProductEditClient productId={productId} initialValues={initialValues} />
      </Stack>
    </Box>
  );
}
