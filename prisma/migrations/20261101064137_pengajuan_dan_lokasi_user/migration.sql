-- AlterTable
ALTER TABLE `user` ADD COLUMN `lokasiId` INTEGER NULL;

-- CreateTable
CREATE TABLE `Pengajuan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lokasiId` INTEGER NOT NULL,
    `userId` INTEGER NULL,
    `alasan` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Pengajuan_lokasiId_idx`(`lokasiId`),
    INDEX `Pengajuan_userId_idx`(`userId`),
    INDEX `Pengajuan_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PengajuanItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pengajuanId` INTEGER NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `merk` VARCHAR(191) NULL,
    `jumlah` INTEGER NOT NULL,
    `satuan` VARCHAR(191) NOT NULL,

    INDEX `PengajuanItem_pengajuanId_idx`(`pengajuanId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `User_lokasiId_idx` ON `User`(`lokasiId`);

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_lokasiId_fkey` FOREIGN KEY (`lokasiId`) REFERENCES `Lokasi`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pengajuan` ADD CONSTRAINT `Pengajuan_lokasiId_fkey` FOREIGN KEY (`lokasiId`) REFERENCES `Lokasi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pengajuan` ADD CONSTRAINT `Pengajuan_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PengajuanItem` ADD CONSTRAINT `PengajuanItem_pengajuanId_fkey` FOREIGN KEY (`pengajuanId`) REFERENCES `Pengajuan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
