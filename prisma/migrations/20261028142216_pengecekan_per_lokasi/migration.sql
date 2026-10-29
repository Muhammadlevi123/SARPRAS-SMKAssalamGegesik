/*
  Warnings:

  - Added the required column `lokasiId` to the `Pengecekan` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `pengecekan` ADD COLUMN `lokasiId` INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX `Pengecekan_lokasiId_tanggal_idx` ON `Pengecekan`(`lokasiId`, `tanggal`);

-- AddForeignKey
ALTER TABLE `Pengecekan` ADD CONSTRAINT `Pengecekan_lokasiId_fkey` FOREIGN KEY (`lokasiId`) REFERENCES `Lokasi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
