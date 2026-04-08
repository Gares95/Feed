-- AlterTable
ALTER TABLE "Article" ADD COLUMN "readAt" DATETIME;

-- CreateIndex
CREATE INDEX "Article_readAt_idx" ON "Article"("readAt");
