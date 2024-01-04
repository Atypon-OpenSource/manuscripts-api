-- AlterTable
ALTER TABLE "ManuscriptDoc" ADD COLUMN     "version" INTEGER DEFAULT 0;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ManuscriptDocHistory" (
    "doc_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "client_id" TEXT NOT NULL,
    "steps" JSONB[],

    CONSTRAINT "ManuscriptDocHistory_pkey" PRIMARY KEY ("doc_id","version")
);
