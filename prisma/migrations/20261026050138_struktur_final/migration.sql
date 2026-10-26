/*
  Warnings:

  - You are about to drop the column `bulan` on the `pengecekan` table. All the data in the column will be lost.
  - You are about to drop the column `tahunAjaran` on the `pengecekan` table. All the data in the column will be lost.
  - You are about to drop the column `rasio` on the `pengecekanitem` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[nama,lokasiId]` on the table `Barang` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `lokasiId` to the `Barang` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `Barang_nama_key` ON `barang`;

-- DropIndex
DROP INDEX `Pengecekan_tahunAjaran_bulan_idx` ON `pengecekan`;

-- AlterTable
ALTER TABLE `barang` ADD COLUMN `lokasiId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `pengecekan` DROP COLUMN `bulan`,
    DROP COLUMN `tahunAjaran`;

-- AlterTable
ALTER TABLE `pengecekanitem` DROP COLUMN `rasio`;

-- CreateTable
CREATE TABLE `Lokasi` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(191) NOT NULL,
    `penanggungJawab` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Lokasi_nama_key`(`nama`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Barang_lokasiId_idx` ON `Barang`(`lokasiId`);

-- CreateIndex
CREATE UNIQUE INDEX `Barang_nama_lokasiId_key` ON `Barang`(`nama`, `lokasiId`);

-- CreateIndex
CREATE INDEX `Pengecekan_tanggal_idx` ON `Pengecekan`(`tanggal`);

-- AddForeignKey
ALTER TABLE `Barang` ADD CONSTRAINT `Barang_lokasiId_fkey` FOREIGN KEY (`lokasiId`) REFERENCES `Lokasi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
