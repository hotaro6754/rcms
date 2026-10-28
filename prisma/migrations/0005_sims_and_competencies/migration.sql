-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'RETIRED');

-- CreateEnum
CREATE TYPE "SimAttemptState" AS ENUM ('IN_PROGRESS', 'SCORED', 'REVIEWED');

-- CreateEnum
CREATE TYPE "CompetencyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'RETIRED');

-- CreateTable
CREATE TABLE "SimCase" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "draft" JSONB NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'DRAFT',
    "hasDraftChanges" BOOLEAN NOT NULL DEFAULT false,
    "programId" TEXT,
    "authorId" TEXT NOT NULL,
    "submittedById" TEXT,
    "reviewerId" TEXT,
    "reviewNote" TEXT,
    "lockVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SimCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimCaseVersion" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "definition" JSONB NOT NULL,
    "publishedById" TEXT NOT NULL,
    "reviewedById" TEXT NOT NULL,
    "retiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimCaseVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "attemptNo" INTEGER NOT NULL,
    "state" "SimAttemptState" NOT NULL DEFAULT 'IN_PROGRESS',
    "answers" JSONB NOT NULL DEFAULT '{}',
    "score" INTEGER,
    "passed" BOOLEAN,
    "result" JSONB,
    "instructorNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SimAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competency" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "expectedBehavior" TEXT NOT NULL,
    "proficiencyLevel" INTEGER NOT NULL,
    "criteria" TEXT[],
    "threshold" INTEGER NOT NULL DEFAULT 75,
    "reassessMonths" INTEGER,
    "status" "CompetencyStatus" NOT NULL DEFAULT 'DRAFT',
    "authorId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "lockVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetencyOutcome" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "demonstrated" BOOLEAN NOT NULL,
    "evidenceScore" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "supersededAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetencyOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SimCase_slug_key" ON "SimCase"("slug");

-- CreateIndex
CREATE INDEX "SimCase_status_idx" ON "SimCase"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SimCaseVersion_caseId_version_key" ON "SimCaseVersion"("caseId", "version");

-- CreateIndex
CREATE INDEX "SimAttempt_caseId_state_idx" ON "SimAttempt"("caseId", "state");

-- CreateIndex
CREATE INDEX "SimAttempt_userId_state_idx" ON "SimAttempt"("userId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "SimAttempt_userId_caseId_attemptNo_key" ON "SimAttempt"("userId", "caseId", "attemptNo");

-- CreateIndex
CREATE UNIQUE INDEX "Competency_code_key" ON "Competency"("code");

-- CreateIndex
CREATE INDEX "CompetencyOutcome_userId_competencyId_idx" ON "CompetencyOutcome"("userId", "competencyId");

-- CreateIndex
CREATE INDEX "CompetencyOutcome_attemptId_idx" ON "CompetencyOutcome"("attemptId");

-- AddForeignKey
ALTER TABLE "SimCaseVersion" ADD CONSTRAINT "SimCaseVersion_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "SimCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimAttempt" ADD CONSTRAINT "SimAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimAttempt" ADD CONSTRAINT "SimAttempt_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "SimCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimAttempt" ADD CONSTRAINT "SimAttempt_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "SimCaseVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetencyOutcome" ADD CONSTRAINT "CompetencyOutcome_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetencyOutcome" ADD CONSTRAINT "CompetencyOutcome_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "Competency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetencyOutcome" ADD CONSTRAINT "CompetencyOutcome_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "SimAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Ranges the application also validates.
ALTER TABLE "Competency" ADD CONSTRAINT "Competency_proficiencyLevel_range" CHECK ("proficiencyLevel" BETWEEN 1 AND 6);
ALTER TABLE "Competency" ADD CONSTRAINT "Competency_threshold_range" CHECK ("threshold" BETWEEN 0 AND 100);
ALTER TABLE "SimAttempt" ADD CONSTRAINT "SimAttempt_score_range" CHECK ("score" IS NULL OR "score" BETWEEN 0 AND 100);
-- One attempt in progress per learner per case.
CREATE UNIQUE INDEX "SimAttempt_one_open" ON "SimAttempt" ("userId", "caseId") WHERE "state" = 'IN_PROGRESS';
