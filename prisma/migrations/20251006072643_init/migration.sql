-- AlterTable
ALTER TABLE `Dealer` ADD COLUMN `createdById` VARCHAR(191) NULL,
    ADD COLUMN `updatedById` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Farmer` ADD COLUMN `createdById` VARCHAR(191) NULL,
    ADD COLUMN `updatedById` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `SubDealer` ADD COLUMN `areaType` VARCHAR(191) NULL,
    ADD COLUMN `averageMonthlyPurchase` DOUBLE NULL,
    ADD COLUMN `brandsSold` VARCHAR(191) NULL,
    ADD COLUMN `businessNotes` VARCHAR(191) NULL,
    ADD COLUMN `competitor` VARCHAR(191) NULL,
    ADD COLUMN `createdById` VARCHAR(191) NULL,
    ADD COLUMN `cropsInArea` VARCHAR(191) NULL,
    ADD COLUMN `mainProducts` VARCHAR(191) NULL,
    ADD COLUMN `relationshipScore` INTEGER NULL,
    ADD COLUMN `updatedById` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Dealer` ADD CONSTRAINT `Dealer_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dealer` ADD CONSTRAINT `Dealer_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubDealer` ADD CONSTRAINT `SubDealer_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubDealer` ADD CONSTRAINT `SubDealer_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Farmer` ADD CONSTRAINT `Farmer_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Farmer` ADD CONSTRAINT `Farmer_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
