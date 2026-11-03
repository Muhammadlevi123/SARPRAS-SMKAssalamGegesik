/*
  Warnings:

  - Added the required column `selesai` to the `TahunAjaran` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `tahunajaran` ADD COLUMN `selesai` DATETIME(3) NOT NULL;
