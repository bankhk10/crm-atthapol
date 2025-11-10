-- Rename promotionBudget to promotionBudgetLimit
ALTER TABLE "DealerDetail" RENAME COLUMN "promotionBudget" TO "promotionBudgetLimit";

-- Add temporaryCreditLimit and temporaryCreditExpiry
ALTER TABLE "DealerDetail"
ADD COLUMN "temporaryCreditLimit" FLOAT,
ADD COLUMN "temporaryCreditExpiry" TIMESTAMP(3);