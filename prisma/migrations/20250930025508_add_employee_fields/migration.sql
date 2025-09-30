-- AlterTable
ALTER TABLE `Employee` ADD COLUMN `birthDate` DATETIME(3) NULL,
    ADD COLUMN `company` VARCHAR(191) NULL,
    ADD COLUMN `gender` ENUM('MALE', 'FEMALE', 'OTHER') NULL,
    ADD COLUMN `responsibilityArea` VARCHAR(191) NULL;
