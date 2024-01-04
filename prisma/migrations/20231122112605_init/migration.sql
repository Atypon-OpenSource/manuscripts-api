-- CreateTable
CREATE TABLE IF NOT EXISTS "ManuscriptDoc" (
    "manuscript_model_id" TEXT NOT NULL,
    "user_model_id" TEXT NOT NULL,
    "project_model_id" TEXT NOT NULL,
    "doc" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManuscriptDoc_pkey" PRIMARY KEY ("manuscript_model_id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ManuscriptSnapshot" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(500) NOT NULL DEFAULT '',
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "doc_id" TEXT NOT NULL,

    CONSTRAINT "ManuscriptSnapshot_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ManuscriptSnapshot" ADD CONSTRAINT "ManuscriptSnapshot_doc_id_fkey" FOREIGN KEY ("doc_id") REFERENCES "ManuscriptDoc"("manuscript_model_id") ON DELETE CASCADE ON UPDATE CASCADE;
