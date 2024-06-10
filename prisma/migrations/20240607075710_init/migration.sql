/*
  Warnings:

  - Added the required column `schema_version` to the `ManuscriptDoc` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ManuscriptDoc" ADD COLUMN     "schema_version" TEXT NOT NULL;
