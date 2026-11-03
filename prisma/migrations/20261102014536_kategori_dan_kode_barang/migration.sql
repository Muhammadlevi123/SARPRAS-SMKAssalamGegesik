-- AlterTable
ALTER TABLE `barang` ADD COLUMN `kategoriId` INTEGER NULL,
    ADD COLUMN `tahunPerolehan` INTEGER NULL;

-- CreateTable
CREATE TABLE `Kategori` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(191) NOT NULL,
    `kode` VARCHAR(3) NOT NULL,
    `noTerakhir` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Kategori_nama_key`(`nama`),
    UNIQUE INDEX `Kategori_kode_key`(`kode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Barang_kategoriId_idx` ON `Barang`(`kategoriId`);

-- AddForeignKey
ALTER TABLE `Barang` ADD CONSTRAINT `Barang_kategoriId_fkey` FOREIGN KEY (`kategoriId`) REFERENCES `Kategori`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
