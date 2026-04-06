-- CreateTable
CREATE TABLE "Feed" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "siteUrl" TEXT,
    "description" TEXT,
    "favicon" TEXT,
    "lastFetched" DATETIME,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "feedId" TEXT NOT NULL,
    "guid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "summary" TEXT,
    "author" TEXT,
    "imageUrl" TEXT,
    "publishedAt" DATETIME NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Article_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "Feed" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Feed_url_key" ON "Feed"("url");

-- CreateIndex
CREATE INDEX "Article_feedId_publishedAt_idx" ON "Article"("feedId", "publishedAt");

-- CreateIndex
CREATE INDEX "Article_isRead_idx" ON "Article"("isRead");

-- CreateIndex
CREATE INDEX "Article_isStarred_idx" ON "Article"("isStarred");

-- CreateIndex
CREATE UNIQUE INDEX "Article_feedId_guid_key" ON "Article"("feedId", "guid");
