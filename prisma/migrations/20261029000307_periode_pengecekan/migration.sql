-- CreateTable
CREATE TABLE `PeriodePengecekan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bulan` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PeriodePengecekan_bulan_key`(`bulan`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
