import { prisma } from "./prisma";

// Resolve the effective DealerDetail (main dealer) for a given customerId.
// This follows these rules:
// - If the customer has a DealerDetail and that dealer has a parentDealerId, return the parent dealer.
// - If the customer has a DealerDetail and no parentDealerId, return that dealer.
// - If the customer is a SubDealer or Farmer, follow its dealerId and then follow parentDealerId if present.
// - Return null when no dealer relationship is found.
export async function resolveEffectiveDealer(customerId: string) {
  return resolveEffectiveDealerWith(prisma, customerId);
}

// Same as above but works with a provided prisma client/transaction (tx)
export async function resolveEffectiveDealerWith(p: any, customerId: string) {
  // 1) Direct dealer
  const dd = await p.dealerDetail.findUnique({ where: { customerId } });
  if (dd) {
    if (dd.parentDealerId) {
      const parent = await p.dealerDetail.findUnique({ where: { id: dd.parentDealerId } });
      return parent ?? dd;
    }
    return dd;
  }

  // 2) Sub-dealer -> dealer
  const sub = await p.subDealerDetail.findUnique({ where: { customerId }, select: { dealerId: true } });
  if (sub?.dealerId) {
    const parent = await p.dealerDetail.findUnique({ where: { id: sub.dealerId } });
    if (parent?.parentDealerId) {
      const pp = await p.dealerDetail.findUnique({ where: { id: parent.parentDealerId } });
      return pp ?? parent;
    }
    return parent;
  }

  // 3) Farmer -> dealer
  const farmer = await p.farmerDetail.findUnique({ where: { customerId }, select: { dealerId: true } });
  if (farmer?.dealerId) {
    const parent = await p.dealerDetail.findUnique({ where: { id: farmer.dealerId } });
    if (parent?.parentDealerId) {
      const pp = await p.dealerDetail.findUnique({ where: { id: parent.parentDealerId } });
      return pp ?? parent;
    }
    return parent;
  }

  return null;
}

export default resolveEffectiveDealer;
