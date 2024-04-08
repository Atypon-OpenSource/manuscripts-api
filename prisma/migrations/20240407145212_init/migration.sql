/*
  Warnings:

  - Made the column `version` on table `ManuscriptDoc` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ManuscriptDoc" ADD COLUMN     "steps" JSONB[] DEFAULT ARRAY[]::JSONB[],
ALTER COLUMN "version" SET NOT NULL;
