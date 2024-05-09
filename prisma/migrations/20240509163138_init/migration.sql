/*
  Warnings:

  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[id]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[connectUserID]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Made the column `version` on table `ManuscriptDoc` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `connectUserID` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `family` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `given` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('Registration', 'ProjectCreated', 'UpdateConnectID', 'Login');

-- AlterTable
ALTER TABLE "ManuscriptDoc" ADD COLUMN     "steps" JSONB[] DEFAULT ARRAY[]::JSONB[],
ALTER COLUMN "version" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
    ADD COLUMN "connectUserID" TEXT NOT NULL DEFAULT '', -- Default value as empty string
    ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "email" TEXT NOT NULL DEFAULT '', -- Default value as empty string
    ADD COLUMN "family" TEXT NOT NULL DEFAULT '', -- Default value as empty string
    ADD COLUMN "given" TEXT NOT NULL DEFAULT '', -- Default value as empty string
    ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "userID" TEXT,
    "projectID" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ManuscriptDoc_project_model_id_idx" ON "ManuscriptDoc"("project_model_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS  "ManuscriptSnapshot_doc_id_idx" ON "ManuscriptSnapshot"("doc_id");

-- CreateIndex
CREATE INDEX  IF NOT EXISTS "Project_data_idx" ON "Project" USING GIN ("data" jsonb_path_ops);

-- CreateIndex
CREATE UNIQUE INDEX "User_id_key" ON "User"("id");

-- CreateIndex
CREATE UNIQUE INDEX "User_connectUserID_key" ON "User"("connectUserID");

-- CreateIndex
CREATE UNIQUE INDEX  "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX  IF NOT EXISTS  "User_connectUserID_idx" ON "User"("connectUserID");

-- CreateIndex
CREATE INDEX  IF NOT EXISTS " "User_email_idx" ON "User"("email");
