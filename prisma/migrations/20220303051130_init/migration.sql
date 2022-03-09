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

-- CreateTable
CREATE TABLE "DerivedData" (
    "id" TEXT NOT NULL,
    "data" JSONB,

    CONSTRAINT "DerivedData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "State" (
    "id" TEXT NOT NULL,
    "data" JSONB,

    CONSTRAINT "State_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discussion" (
    "id" TEXT NOT NULL,
    "data" JSONB,

    CONSTRAINT "Discussion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "User_data_idx" ON "User" USING HASH ("data");
