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
CREATE TABLE "manuscript_doc_history" (
    "doc_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "client_id" TEXT,
    "steps" JSONB[],

    CONSTRAINT "manuscript_doc_history_pkey" PRIMARY KEY ("doc_id","version")
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

-- CreateTable
CREATE TABLE "manuscript_comment" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "target_id" TEXT NOT NULL,
    "user_model_id" TEXT NOT NULL,
    "doc_id" TEXT NOT NULL,
    "snapshot_id" TEXT,

    CONSTRAINT "manuscript_comment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "manuscript_doc_snapshot" ADD CONSTRAINT "manuscript_doc_snapshot_doc_id_fkey" FOREIGN KEY ("doc_id") REFERENCES "manuscript_doc"("manuscript_model_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manuscript_comment" ADD CONSTRAINT "manuscript_comment_doc_id_fkey" FOREIGN KEY ("doc_id") REFERENCES "manuscript_doc"("manuscript_model_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manuscript_comment" ADD CONSTRAINT "manuscript_comment_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "manuscript_doc_snapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
