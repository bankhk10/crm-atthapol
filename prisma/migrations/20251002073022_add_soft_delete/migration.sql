/*
  Warnings:

  - You are about to drop the column `deletedAt` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `RolePermission` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `VerificationToken` table. All the data in the column will be lost.
  - You are about to drop the `AuditLog` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE `Account` DROP COLUMN `deletedAt`;

-- AlterTable
ALTER TABLE `RolePermission` DROP COLUMN `deletedAt`;

-- AlterTable
ALTER TABLE `Session` DROP COLUMN `deletedAt`;

-- AlterTable
ALTER TABLE `VerificationToken` DROP COLUMN `deletedAt`;

-- DropTable
DROP TABLE `AuditLog`;
