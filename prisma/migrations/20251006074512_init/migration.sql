-- AlterTable
ALTER TABLE `Dealer` ADD COLUMN `averageMonthlyPurchase` DOUBLE NULL,
    ADD COLUMN `brandsSold` VARCHAR(191) NULL,
    ADD COLUMN `businessNotes` VARCHAR(191) NULL,
    ADD COLUMN `mainProducts` VARCHAR(191) NULL,
    ADD COLUMN `relationshipScore` INTEGER NULL;
