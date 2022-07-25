-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "data" JSONB,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "data" JSONB,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);
