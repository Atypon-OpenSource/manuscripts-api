/*
  Warnings:

  - A unique constraint covering the columns `[id]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Made the column `version` on table `ManuscriptDoc` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ManuscriptDoc" ADD COLUMN     "steps" JSONB[] DEFAULT ARRAY[]::JSONB[],
ALTER COLUMN "version" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "connectUserID" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "email" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "family" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "given" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userID" TEXT,
    "projectID" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ManuscriptDoc_project_model_id_idx" ON "ManuscriptDoc"("project_model_id");

-- CreateIndex
CREATE INDEX "ManuscriptSnapshot_doc_id_idx" ON "ManuscriptSnapshot"("doc_id");

-- CreateIndex
CREATE INDEX "Project_data_idx" ON "Project" USING GIN ("data" jsonb_path_ops);

-- CreateIndex
CREATE UNIQUE INDEX "User_id_key" ON "User"("id");
