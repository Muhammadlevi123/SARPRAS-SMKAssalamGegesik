/*
  Warnings:

  - You are about to drop the column `kategori` on the `barang` table. All the data in the column will be lost.
  - Made the column `kode` on table `barang` required. This step will fail if there are existing NULL values in that column.
  - Made the column `kategoriId` on table `barang` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tahunPerolehan` on table `barang` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `barang` DROP FOREIGN KEY `Barang_kategoriId_fkey`;

-- DropIndex
DROP INDEX `Barang_kategori_idx` ON `barang`;

-- AlterTable
ALTER TABLE `barang` DROP COLUMN `kategori`,
    MODIFY `kode` VARCHAR(191) NOT NULL,
    MODIFY `kategoriId` INTEGER NOT NULL,
    MODIFY `tahunPerolehan` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `Barang` ADD CONSTRAINT `Barang_kategoriId_fkey` FOREIGN KEY (`kategoriId`) REFERENCES `Kategori`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
