import { prisma } from "@/lib/prisma";

export type ProductListItem = {
  id: string;
  productCode: string;
  nameTH: string;
  category: string;
  brand?: string | null;
  unit?: string | null;
  price?: number | null;
  stockOnHand: number;
  status: "ACTIVE" | "INACTIVE" | "EXPIRED";
  createdAt: string;
};

export async function getProducts(): Promise<ProductListItem[]> {
  const items = await prisma.product.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { stocks: true },
  });
  return items.map((p) => {
    const stock = (p.stocks || []).reduce(
      (sum, s) => sum + (s.qtyOnHand || 0) - (s.qtyReserved || 0),
      0,
    );
    return {
      id: p.id,
      productCode: p.productCode,
      nameTH: p.nameTH,
      category: p.category,
      brand: p.brand ?? null,
      unit: p.unit ?? null,
      price: p.price ?? null,
      stockOnHand: stock,
      status: p.status as any,
      createdAt: new Date(p.createdAt).toISOString(),
    };
  });
}

export async function getProduct(productId: string) {
  const p = await prisma.product.findUnique({
    where: { id: productId, deletedAt: null },
    include: { stocks: true },
  });
  return p ?? null;
}

