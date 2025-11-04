import { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

type OrderWithItems = {
  id: string;
  shippingDate: Date | null;
  items: Array<{
    id: string;
    productId: string | null;
    qty: number | null;
  }>;
};

export async function releaseOrderReservations(tx: Tx, saleOrderId: string) {
  const reservations = await tx.saleOrderStockReservation.findMany({
    where: { saleOrderId, releasedAt: null, deletedAt: null },
  });

  for (const reservation of reservations) {
    if (!reservation.stockId) continue;
    const stock = await tx.stock.findUnique({
      where: { id: reservation.stockId },
      select: { qtyReserved: true, productId: true },
    });
    const currentReserved = Number(stock?.qtyReserved ?? 0);
    const qty = Math.max(0, Math.floor(Number(reservation.qty ?? 0)));
    const releaseQty = Math.min(currentReserved, qty);
    if (releaseQty > 0) {
      await tx.stock.update({
        where: { id: reservation.stockId },
        data: { qtyReserved: { decrement: releaseQty } },
      });
      await tx.stockMovement.create({
        data: {
          stockId: reservation.stockId,
          productId: stock?.productId as string,
          saleOrderId,
          type: "RELEASE",
          qty: releaseQty,
        },
      });
    }
    await tx.saleOrderStockReservation.update({
      where: { id: reservation.id },
      data: { releasedAt: new Date() },
    });
  }
}

export async function applyStockForOrder(tx: Tx, order: OrderWithItems) {
  const shippingDate = order.shippingDate ? new Date(order.shippingDate) : null;
  const issueImmediately = Boolean(shippingDate);

  for (const item of order.items) {
    if (!item?.productId) continue;
    let remaining = Math.max(0, Math.floor(Number(item.qty ?? 0)));
    if (!Number.isFinite(remaining) || remaining <= 0) continue;

    const stocks = await tx.stock.findMany({
      where: { productId: item.productId, deletedAt: null },
      orderBy: [
        { expDate: "asc" },
        { mfgDate: "asc" },
        { createdAt: "asc" },
      ],
    });

    for (const stock of stocks) {
      if (remaining <= 0) break;
      const onHand = Number(stock.qtyOnHand ?? 0);
      const reserved = Number(stock.qtyReserved ?? 0);
      const available = Math.max(0, issueImmediately ? onHand : onHand - reserved);
      if (available <= 0) continue;
      const allocation = Math.min(available, remaining);
      if (allocation <= 0) continue;

      if (issueImmediately) {
        await tx.stock.update({
          where: { id: stock.id },
          data: { qtyOnHand: { decrement: allocation } },
        });
        await tx.stockMovement.create({
          data: {
            stockId: stock.id,
            productId: stock.productId,
            saleOrderId: order.id,
            type: "ISSUE",
            qty: allocation,
          },
        });
      } else {
        await tx.stock.update({
          where: { id: stock.id },
          data: { qtyReserved: { increment: allocation } },
        });
        await tx.saleOrderStockReservation.create({
          data: {
            saleOrderId: order.id,
            stockId: stock.id,
            qty: allocation,
          },
        });
        await tx.stockMovement.create({
          data: {
            stockId: stock.id,
            productId: stock.productId,
            saleOrderId: order.id,
            type: "RESERVE",
            qty: allocation,
          },
        });
      }
      remaining -= allocation;
    }
  }
}

export async function rebuildOrderStockCommit(tx: Tx, order: OrderWithItems) {
  await releaseOrderReservations(tx, order.id);
  await applyStockForOrder(tx, order);
}
