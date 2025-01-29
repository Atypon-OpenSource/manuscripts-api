/*
  Warnings:

  - The primary key for the `MigrationBackup` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Made the column `id` on table `MigrationBackup` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "MigrationBackup" DROP CONSTRAINT "MigrationBackup_pkey",
ALTER COLUMN "id" SET NOT NULL,
ADD CONSTRAINT "MigrationBackup_pkey" PRIMARY KEY ("id");
