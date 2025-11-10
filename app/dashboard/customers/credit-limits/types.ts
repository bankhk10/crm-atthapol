import { Customer, DealerDetail } from "@prisma/client";

// Extended DealerDetail type with new fields
type ExtendedDealerDetail = DealerDetail & {
  temporaryCreditLimit: number | null;
  temporaryCreditExpiry: Date | null;
  promotionBudgetLimit: number | null;
};

export type CustomerWithDetails = Customer & {
  dealerDetail: ExtendedDealerDetail | null;
};