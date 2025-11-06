import { prisma } from "@/lib/prisma";

export type ProductListItem = {
  id: string;
  productCode: string;
  nameTH: string;
  category: string;
  brand?: string | null;
  unit?: string | null;
  price?: number | null;
  expDate?: string | null;
  stockOnHand: number;
  stockAvailable: number;
  stockReserved: number;
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
      const totals = (p.stocks || []).reduce(
        (acc, s) => {
          // Show physical on-hand quantity here (no reservation deduction)
          acc.onHand += s.qtyOnHand || 0;
          acc.reserved += s.qtyReserved || 0;
          return acc;
        },
        { onHand: 0, reserved: 0 },
      );
      return {
        id: p.id,
        productCode: p.productCode,
        nameTH: p.nameTH,
        category: p.category,
        brand: p.brand ?? null,
        unit: p.unit ?? null,
        price: p.price ?? null,
        expDate: p.expDate ? new Date(p.expDate).toISOString() : null,
        stockOnHand: totals.onHand,
        stockAvailable: Math.max(0, totals.onHand - totals.reserved),
        stockReserved: totals.reserved,
        status: p.status as any,
        createdAt: new Date(p.createdAt).toISOString(),
      };
    });
}

export async function getProduct(productId: string) {
  const p = await prisma.product.findUnique({
    where: { id: productId, deletedAt: null },
    include: {
      stocks: {
        include: {
          // Include master names for display
          warehouseRef: true,
          locationRef: true,
        },
      },
      plants: { include: { plant: true } },
    },
  });
  if (!p) return null;
  // Fetch images via raw query to avoid relying on regenerated client types
  const images = await prisma.$queryRaw<{ id: string; url: string; sort: number; createdAt: Date }[]>`
    SELECT "id", "url", "sort", "createdAt"
    FROM "ProductImage"
    WHERE "productId" = ${productId}
    ORDER BY "sort" ASC, "createdAt" ASC
  `;
  return { ...(p as any), images } as any;
}
