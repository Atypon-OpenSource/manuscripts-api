/*
  Warnings:

  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[id]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[connectUserID]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Made the column `version` on table `ManuscriptDoc` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ManuscriptDoc" ADD COLUMN IF NOT EXISTS     "steps" JSONB[] DEFAULT ARRAY[]::JSONB[],
ALTER COLUMN "version" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ADD COLUMN IF NOT EXISTS     "connectUserID" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS     "email" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS     "family" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS     "given" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Event" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userID" TEXT,
    "projectID" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ManuscriptDoc_project_model_id_idx" ON "ManuscriptDoc"("project_model_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ManuscriptSnapshot_doc_id_idx" ON "ManuscriptSnapshot"("doc_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Project_data_idx" ON "Project" USING GIN ("data" jsonb_path_ops);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_id_key" ON "User"("id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_connectuserID_idx" ON "User"("connectUserID");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");
