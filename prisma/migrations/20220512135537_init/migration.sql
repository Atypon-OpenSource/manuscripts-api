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
CREATE TABLE "Channel" (
    "docId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "Access" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channelName" TEXT NOT NULL,

    CONSTRAINT "Access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Channel_docId_idx" ON "Channel" USING HASH ("docId");

-- CreateIndex
CREATE UNIQUE INDEX "Channel_docId_name_key" ON "Channel"("docId", "name");

-- CreateIndex
CREATE INDEX "Access_channelName_idx" ON "Access" USING HASH ("channelName");

-- CreateIndex
CREATE INDEX "Access_userId_idx" ON "Access" USING HASH ("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Access_userId_channelName_key" ON "Access"("userId", "channelName");

-- AddForeignKey
ALTER TABLE "Access" ADD CONSTRAINT "Access_channelName_fkey" FOREIGN KEY ("channelName") REFERENCES "Channel"("name") ON DELETE RESTRICT ON UPDATE CASCADE;
