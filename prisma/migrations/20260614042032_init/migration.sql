-- CreateEnum
CREATE TYPE "Source" AS ENUM ('text', 'photo');

-- CreateTable
CREATE TABLE "Transaction" (
    "id" SERIAL NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "telegramMessageId" TEXT,
    "source" "Source" NOT NULL,
    "groupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_telegramMessageId_key" ON "Transaction"("telegramMessageId");

-- CreateIndex
CREATE INDEX "Transaction_groupId_idx" ON "Transaction"("groupId");
