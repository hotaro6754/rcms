-- CreateEnum
CREATE TYPE "LibraryKind" AS ENUM ('GLOSSARY', 'PROCESS', 'CASE_STUDY', 'TOOLKIT', 'RESOURCE');

-- CreateEnum
CREATE TYPE "LibraryStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED');

-- AlterEnum
ALTER TYPE "BlockKind" ADD VALUE 'AUDIO';

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "contentOwnerId" TEXT,
ADD COLUMN     "lastReviewedAt" TIMESTAMP(3),
ADD COLUMN     "nextReviewAt" TIMESTAMP(3),
ADD COLUMN     "sources" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Module" ADD COLUMN     "prerequisiteModuleId" TEXT;

-- AlterTable
ALTER TABLE "Program" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "isTemplate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requiresCourseId" TEXT;

-- CreateTable
CREATE TABLE "LibraryEntry" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" "LibraryKind" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sources" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "levelId" TEXT,
    "status" "LibraryStatus" NOT NULL DEFAULT 'DRAFT',
    "published" JSONB,
    "hasDraftChanges" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT NOT NULL,
    "submittedById" TEXT,
    "reviewerId" TEXT,
    "reviewNote" TEXT,
    "lastReviewedAt" TIMESTAMP(3),
    "nextReviewAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "lockVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LibraryEntry_slug_key" ON "LibraryEntry"("slug");

-- CreateIndex
CREATE INDEX "LibraryEntry_kind_status_idx" ON "LibraryEntry"("kind", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_userId_lessonId_key" ON "Bookmark"("userId", "lessonId");

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

