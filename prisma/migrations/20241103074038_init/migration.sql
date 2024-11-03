-- AlterTable
ALTER TABLE "MigrationBackup" ADD COLUMN     "id" TEXT;
UPDATE "MigrationBackup" SET "id" = gen_random_uuid() WHERE "id" IS NULL;