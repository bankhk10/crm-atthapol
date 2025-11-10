-- Create enum TempCreditRequestStatus
CREATE TYPE "TempCreditRequestStatus" AS ENUM ('PENDING','APPROVED','REJECTED');

-- Create table TempCreditRequest
CREATE TABLE "TempCreditRequest" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "customerId" TEXT NOT NULL,
  "requestedByUserId" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "expiryDate" TIMESTAMP(3),
  "reason" TEXT,
  "status" "TempCreditRequestStatus" NOT NULL DEFAULT 'PENDING',
  "processedByUserId" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) DEFAULT now(),
  "updatedAt" TIMESTAMP(3) DEFAULT now(),
  "deletedAt" TIMESTAMP(3)
);

-- Foreign key to Customer
ALTER TABLE "TempCreditRequest" ADD CONSTRAINT "TempCreditRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
