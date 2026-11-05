-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER',
    `lokasiId` INTEGER NULL,
    `sesiVersi` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_lokasiId_idx`(`lokasiId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TahunAjaran` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(191) NOT NULL,
    `mulai` DATETIME(3) NOT NULL,
    `selesai` DATETIME(3) NOT NULL,
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

-- CreateTable
CREATE TABLE `Barang` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `merk` VARCHAR(191) NULL,
    `kategoriId` INTEGER NOT NULL,
    `tahunPerolehan` INTEGER NOT NULL,
    `satuan` VARCHAR(191) NOT NULL,
    `lokasiId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Barang_kode_key`(`kode`),
    INDEX `Barang_lokasiId_idx`(`lokasiId`),
    INDEX `Barang_kategoriId_idx`(`kategoriId`),
    UNIQUE INDEX `Barang_nama_merk_lokasiId_key`(`nama`, `merk`, `lokasiId`),
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
    `biayaLain` JSON NULL,
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

    INDEX `BarangMasukItem_barangMasukId_idx`(`barangMasukId`),
    INDEX `BarangMasukItem_barangId_idx`(`barangId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pengecekan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lokasiId` INTEGER NOT NULL,
    `tanggal` DATETIME(3) NOT NULL,
    `petugas` VARCHAR(191) NOT NULL,
    `catatan` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Pengecekan_lokasiId_tanggal_idx`(`lokasiId`, `tanggal`),
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

-- CreateTable
CREATE TABLE `PeriodePengecekan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bulan` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PeriodePengecekan_bulan_key`(`bulan`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_lokasiId_fkey` FOREIGN KEY (`lokasiId`) REFERENCES `Lokasi`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Barang` ADD CONSTRAINT `Barang_lokasiId_fkey` FOREIGN KEY (`lokasiId`) REFERENCES `Lokasi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Barang` ADD CONSTRAINT `Barang_kategoriId_fkey` FOREIGN KEY (`kategoriId`) REFERENCES `Kategori`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BarangMasuk` ADD CONSTRAINT `BarangMasuk_mitraId_fkey` FOREIGN KEY (`mitraId`) REFERENCES `Mitra`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BarangMasukItem` ADD CONSTRAINT `BarangMasukItem_barangMasukId_fkey` FOREIGN KEY (`barangMasukId`) REFERENCES `BarangMasuk`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BarangMasukItem` ADD CONSTRAINT `BarangMasukItem_barangId_fkey` FOREIGN KEY (`barangId`) REFERENCES `Barang`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pengecekan` ADD CONSTRAINT `Pengecekan_lokasiId_fkey` FOREIGN KEY (`lokasiId`) REFERENCES `Lokasi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PengecekanItem` ADD CONSTRAINT `PengecekanItem_pengecekanId_fkey` FOREIGN KEY (`pengecekanId`) REFERENCES `Pengecekan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PengecekanItem` ADD CONSTRAINT `PengecekanItem_barangId_fkey` FOREIGN KEY (`barangId`) REFERENCES `Barang`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pengajuan` ADD CONSTRAINT `Pengajuan_lokasiId_fkey` FOREIGN KEY (`lokasiId`) REFERENCES `Lokasi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pengajuan` ADD CONSTRAINT `Pengajuan_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PengajuanItem` ADD CONSTRAINT `PengajuanItem_pengajuanId_fkey` FOREIGN KEY (`pengajuanId`) REFERENCES `Pengajuan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
