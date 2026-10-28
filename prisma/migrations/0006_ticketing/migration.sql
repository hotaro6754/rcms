-- CreateEnum
CREATE TYPE "TicketSource" AS ENUM ('WEB_FORM', 'CHAT', 'ASSISTANT', 'COURSE_PAGE', 'ACCOUNT', 'STAFF');

-- CreateEnum
CREATE TYPE "TicketEventKind" AS ENUM ('CREATED', 'ROUTED', 'ASSIGNED', 'UNASSIGNED', 'TEAM_CHANGED', 'STATUS', 'PRIORITY', 'ESCALATED', 'REOPENED', 'SLA_WARNING', 'SLA_BREACH', 'RESOLVED', 'CLOSED');

-- AlterTable
ALTER TABLE "SupportTicket" ADD COLUMN     "firstResponseBreachedAt" TIMESTAMP(3),
ADD COLUMN     "firstResponseDueAt" TIMESTAMP(3),
ADD COLUMN     "impact" INTEGER,
ADD COLUMN     "pageContext" TEXT,
ADD COLUMN     "programId" TEXT,
ADD COLUMN     "relatedRef" TEXT,
ADD COLUMN     "resolutionBreachedAt" TIMESTAMP(3),
ADD COLUMN     "resolutionDueAt" TIMESTAMP(3),
ADD COLUMN     "resolutionSummary" TEXT,
ADD COLUMN     "slaWarnedAt" TIMESTAMP(3),
ADD COLUMN     "source" "TicketSource" NOT NULL DEFAULT 'WEB_FORM',
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "teamId" TEXT,
ADD COLUMN     "urgency" INTEGER;

-- CreateTable
CREATE TABLE "SupportTeam" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "autoAssign" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isLead" BOOLEAN NOT NULL DEFAULT false,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "maxOpen" INTEGER NOT NULL DEFAULT 15,
    "lastAssignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportCategorySetting" (
    "category" "SupportCategory" NOT NULL,
    "label" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "teamId" TEXT,
    "defaultPriority" "SupportPriority" NOT NULL DEFAULT 'NORMAL',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportCategorySetting_pkey" PRIMARY KEY ("category")
);

-- CreateTable
CREATE TABLE "SupportSlaPolicy" (
    "priority" "SupportPriority" NOT NULL,
    "firstResponseMinutes" INTEGER NOT NULL,
    "resolutionMinutes" INTEGER NOT NULL,
    "businessHours" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportSlaPolicy_pkey" PRIMARY KEY ("priority")
);

-- CreateTable
CREATE TABLE "SupportCalendar" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "utcOffsetMinutes" INTEGER NOT NULL DEFAULT 330,
    "workDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6]::INTEGER[],
    "startMinute" INTEGER NOT NULL DEFAULT 600,
    "endMinute" INTEGER NOT NULL DEFAULT 1140,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicketEvent" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "actorId" TEXT,
    "kind" "TicketEventKind" NOT NULL,
    "from" TEXT,
    "to" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicketEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportAttachment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "messageId" TEXT,
    "uploaderId" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupportTeam_key_key" ON "SupportTeam"("key");

-- CreateIndex
CREATE UNIQUE INDEX "SupportTeamMember_teamId_userId_key" ON "SupportTeamMember"("teamId", "userId");

-- CreateIndex
CREATE INDEX "SupportTicketEvent_ticketId_createdAt_idx" ON "SupportTicketEvent"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "SupportTicketEvent_kind_createdAt_idx" ON "SupportTicketEvent"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "SupportAttachment_ticketId_idx" ON "SupportAttachment"("ticketId");

-- CreateIndex
CREATE INDEX "SupportTicket_teamId_status_idx" ON "SupportTicket"("teamId", "status");

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "SupportTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTeamMember" ADD CONSTRAINT "SupportTeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "SupportTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTeamMember" ADD CONSTRAINT "SupportTeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportCategorySetting" ADD CONSTRAINT "SupportCategorySetting_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "SupportTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicketEvent" ADD CONSTRAINT "SupportTicketEvent_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportAttachment" ADD CONSTRAINT "SupportAttachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_impact_range" CHECK ("impact" IS NULL OR "impact" BETWEEN 1 AND 3);
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_urgency_range" CHECK ("urgency" IS NULL OR "urgency" BETWEEN 1 AND 3);
ALTER TABLE "SupportCalendar" ADD CONSTRAINT "SupportCalendar_hours" CHECK ("startMinute" >= 0 AND "endMinute" <= 1440 AND "startMinute" < "endMinute");
ALTER TABLE "SupportSlaPolicy" ADD CONSTRAINT "SupportSlaPolicy_positive" CHECK ("firstResponseMinutes" > 0 AND "resolutionMinutes" >= "firstResponseMinutes");
ALTER TABLE "SupportTeamMember" ADD CONSTRAINT "SupportTeamMember_maxOpen" CHECK ("maxOpen" BETWEEN 1 AND 500);
