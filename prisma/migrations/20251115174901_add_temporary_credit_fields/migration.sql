-- AlterDealerDetailAddCreditFields
ALTER TABLE "DealerDetail" 
ADD COLUMN "temporaryCreditLimit" FLOAT,
ADD COLUMN "temporaryCreditExpiry" TIMESTAMP(3),
ADD COLUMN "promotionBudgetLimit" FLOAT;