-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TahunAjaran` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(191) NOT NULL,
    `mulai` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `TahunAjaran_nama_key`(`nama`),
    UNIQUE INDEX `TahunAjaran_mulai_key`(`mulai`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Lokasi` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(191) NOT NULL,
    `penanggungJawab` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Lokasi_nama_key`(`nama`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Barang` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(191) NULL,
    `nama` VARCHAR(191) NOT NULL,
    `merk` VARCHAR(191) NULL,
    `kategori` VARCHAR(191) NULL,
    `satuan` VARCHAR(191) NOT NULL,
    `lokasiId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Barang_kode_key`(`kode`),
    INDEX `Barang_lokasiId_idx`(`lokasiId`),
    INDEX `Barang_kategori_idx`(`kategori`),
    UNIQUE INDEX `Barang_nama_lokasiId_key`(`nama`, `lokasiId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Mitra` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(191) NOT NULL,
    `kontak` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Mitra_nama_key`(`nama`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BarangMasuk` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tanggal` DATETIME(3) NOT NULL,
    `sumber` ENUM('PEMBELIAN', 'MOU', 'BANTUAN', 'LAMA') NOT NULL,
    `noNota` VARCHAR(191) NULL,
    `mitraId` INTEGER NULL,
    `foto` VARCHAR(191) NULL,
    `keterangan` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BarangMasuk_tanggal_idx`(`tanggal`),
    INDEX `BarangMasuk_sumber_idx`(`sumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BarangMasukItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `barangMasukId` INTEGER NOT NULL,
    `barangId` INTEGER NOT NULL,
    `jumlah` INTEGER NOT NULL,
    `harga` INTEGER NULL,
    `spesifikasi` VARCHAR(191) NULL,

    INDEX `BarangMasukItem_barangMasukId_idx`(`barangMasukId`),
    INDEX `BarangMasukItem_barangId_idx`(`barangId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pengecekan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tanggal` DATETIME(3) NOT NULL,
    `petugas` VARCHAR(191) NOT NULL,
    `catatan` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Pengecekan_tanggal_idx`(`tanggal`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PengecekanItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pengecekanId` INTEGER NOT NULL,
    `barangId` INTEGER NOT NULL,
    `jumlahAda` INTEGER NOT NULL,
    `rusakRingan` INTEGER NOT NULL DEFAULT 0,
    `rusakBerat` INTEGER NOT NULL DEFAULT 0,
    `keterangan` VARCHAR(191) NULL,

    UNIQUE INDEX `PengecekanItem_pengecekanId_barangId_key`(`pengecekanId`, `barangId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Barang` ADD CONSTRAINT `Barang_lokasiId_fkey` FOREIGN KEY (`lokasiId`) REFERENCES `Lokasi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BarangMasuk` ADD CONSTRAINT `BarangMasuk_mitraId_fkey` FOREIGN KEY (`mitraId`) REFERENCES `Mitra`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BarangMasukItem` ADD CONSTRAINT `BarangMasukItem_barangMasukId_fkey` FOREIGN KEY (`barangMasukId`) REFERENCES `BarangMasuk`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BarangMasukItem` ADD CONSTRAINT `BarangMasukItem_barangId_fkey` FOREIGN KEY (`barangId`) REFERENCES `Barang`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PengecekanItem` ADD CONSTRAINT `PengecekanItem_pengecekanId_fkey` FOREIGN KEY (`pengecekanId`) REFERENCES `Pengecekan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PengecekanItem` ADD CONSTRAINT `PengecekanItem_barangId_fkey` FOREIGN KEY (`barangId`) REFERENCES `Barang`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
