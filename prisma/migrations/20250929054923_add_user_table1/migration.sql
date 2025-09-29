-- CreateTable
CREATE TABLE `Employee` (
    `id` VARCHAR(191) NOT NULL,
    `employeeCode` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `position` VARCHAR(191) NOT NULL,
    `department` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `status` ENUM('ACTIVE', 'ON_LEAVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Employee_employeeCode_key`(`employeeCode`),
    UNIQUE INDEX `Employee_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Employee` ADD CONSTRAINT `Employee_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
