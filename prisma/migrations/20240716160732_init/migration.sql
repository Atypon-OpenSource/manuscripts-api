-- CreateTable
CREATE TABLE "MigrationBackup" (
    "manuscript_model_id" TEXT NOT NULL,
    "user_model_id" TEXT NOT NULL,
    "project_model_id" TEXT NOT NULL,
    "doc" JSONB NOT NULL,
    "version" INTEGER DEFAULT 0,
    "schema_version" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MigrationBackup_pkey" PRIMARY KEY ("manuscript_model_id")
);
