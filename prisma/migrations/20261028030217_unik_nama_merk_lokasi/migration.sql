/*
  Warnings:

  - A unique constraint covering the columns `[nama,merk,lokasiId]` on the table `Barang` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `Barang_nama_lokasiId_key` ON `barang`;

-- CreateIndex
CREATE UNIQUE INDEX `Barang_nama_merk_lokasiId_key` ON `Barang`(`nama`, `merk`, `lokasiId`);
