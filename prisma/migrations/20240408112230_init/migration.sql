/*
  Warnings:

  - You are about to drop the `ManuscriptDocHistory` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `version` on table `ManuscriptDoc` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ManuscriptDoc" ADD COLUMN     "steps" JSONB[] DEFAULT ARRAY[]::JSONB[],
ALTER COLUMN "version" SET NOT NULL;

-- DropTable
DROP TABLE "ManuscriptDocHistory";
