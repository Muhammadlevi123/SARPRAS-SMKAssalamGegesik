-- AlterTable
ALTER TABLE `user` ADD COLUMN `sesiVersi` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `PercobaanLogin` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(254) NOT NULL,
    `ip` VARCHAR(45) NOT NULL,
    `berhasil` BOOLEAN NOT NULL,
    `alasan` VARCHAR(20) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PercobaanLogin_email_createdAt_idx`(`email`, `createdAt`),
    INDEX `PercobaanLogin_ip_createdAt_idx`(`ip`, `createdAt`),
    INDEX `PercobaanLogin_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
