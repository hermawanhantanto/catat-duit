-- CreateEnum
CREATE TYPE "Status" AS ENUM ('pending', 'active', 'deleted');

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "status" "Status" NOT NULL DEFAULT 'active';

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");
