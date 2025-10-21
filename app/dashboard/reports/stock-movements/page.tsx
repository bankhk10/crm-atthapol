import { prisma } from "@/lib/prisma";
import { MovementsClient, type Option } from "./_components/movements-client";

export const runtime = "nodejs";

export default async function StockMovementsReportPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: { id: true, productCode: true, nameTH: true },
    orderBy: [{ productCode: "asc" }],
  });
  const productOptions: Option[] = products.map((p) => ({ id: p.id, label: `${p.productCode} - ${p.nameTH}` }));
  const sp = await searchParams;
  const initialSaleOrderId = (sp?.["saleOrderId"] as string | undefined) || null;
  return <MovementsClient productOptions={productOptions} initialSaleOrderId={initialSaleOrderId} />;
}
