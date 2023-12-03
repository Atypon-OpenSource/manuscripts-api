-- CreateTable
CREATE TABLE "ManuscriptDocHistory" (
    "doc_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "client_id" TEXT,
    "steps" JSONB[],

    CONSTRAINT "ManuscriptDocHistory_pkey" PRIMARY KEY ("doc_id","version")
);
