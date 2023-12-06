/*
  Warnings:

  - Added the required column `version` to the `ManuscriptDoc` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ManuscriptDoc" ADD COLUMN     "version" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "ManuscriptDocHistory" (
    "doc_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "client_id" TEXT NOT NULL,
    "steps" JSONB[],

    CONSTRAINT "ManuscriptDocHistory_pkey" PRIMARY KEY ("doc_id","version")
);
