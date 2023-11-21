-- CreateTable
CREATE TABLE "manuscript_doc" (
    "manuscript_model_id" TEXT NOT NULL,
    "user_model_id" TEXT NOT NULL,
    "project_model_id" TEXT NOT NULL,
    "doc" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manuscript_doc_pkey" PRIMARY KEY ("manuscript_model_id")
);

-- CreateTable
CREATE TABLE "manuscript_doc_snapshot" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(500) NOT NULL DEFAULT '',
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "doc_id" TEXT NOT NULL,

    CONSTRAINT "manuscript_doc_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_manuscript_model_id" ON "manuscript_doc"("manuscript_model_id");

-- CreateIndex
CREATE INDEX "idx_project_model_id" ON "manuscript_doc"("project_model_id");

-- CreateIndex
CREATE INDEX "idx_doc_id" ON "manuscript_doc_snapshot"("doc_id");

-- AddForeignKey
ALTER TABLE "manuscript_doc_snapshot" ADD CONSTRAINT "manuscript_doc_snapshot_doc_id_fkey" FOREIGN KEY ("doc_id") REFERENCES "manuscript_doc"("manuscript_model_id") ON DELETE CASCADE ON UPDATE CASCADE;
