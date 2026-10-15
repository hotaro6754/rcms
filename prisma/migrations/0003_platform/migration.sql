-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('INVITATION_PENDING', 'PENDING_VERIFICATION', 'ACTIVE', 'TRIAL', 'PAYMENT_PENDING', 'PAYMENT_FAILED', 'GRACE_PERIOD', 'SUSPENDED', 'COMPLETED', 'CANCELLED', 'DEACTIVATED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('SUPER_ADMIN', 'ACADEMY_DIRECTOR', 'CONTENT_ADMIN', 'ACADEMIC_REVIEWER', 'COMPLIANCE_REVIEWER', 'SUBSCRIBER_ADMIN', 'SUPPORT_AGENT', 'SUPPORT_MANAGER', 'FINANCE_ADMIN', 'VENDOR_MANAGER', 'REPORTING_ANALYST', 'AUDITOR');

-- CreateEnum
CREATE TYPE "ApprovalKind" AS ENUM ('ROLE_CHANGE', 'PRICE_CHANGE', 'VENDOR_PAYOUT_CHANGE', 'DATA_EXPORT', 'COURSE_DELETE', 'SECURITY_SETTING', 'PROGRESS_RESET');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXECUTED', 'FAILED');

-- CreateEnum
CREATE TYPE "PrivacyRequestKind" AS ENUM ('ACCESS', 'DELETION', 'CORRECTION');

-- CreateEnum
CREATE TYPE "PrivacyRequestStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'IN_DEVELOPMENT', 'ACADEMIC_REVIEW', 'COMPLIANCE_REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'UNDER_REVISION', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LessonCompletion" AS ENUM ('MANUAL', 'ASSESSMENT_PASS');

-- CreateEnum
CREATE TYPE "BlockKind" AS ENUM ('TEXT', 'HEADING', 'CALLOUT', 'IMAGE', 'VIDEO', 'LINK', 'TABLE', 'STEPS', 'SCENARIO', 'CODE');

-- CreateEnum
CREATE TYPE "ReviewStage" AS ENUM ('ACADEMIC', 'COMPLIANCE', 'PUBLICATION');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'DOCUMENT', 'VIDEO', 'AUDIO');

-- CreateEnum
CREATE TYPE "AssessmentKind" AS ENUM ('KNOWLEDGE_CHECK', 'MODULE_TEST', 'FINAL', 'ASSIGNMENT');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SINGLE', 'MULTI', 'TRUE_FALSE', 'MATCHING', 'SEQUENCE', 'SHORT_ANSWER', 'FILE_UPLOAD');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'PENDING_REVIEW', 'GRADED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "EnrolmentSource" AS ENUM ('ADMIN', 'FREE', 'PURCHASE', 'SUBSCRIPTION', 'COMPLIMENTARY', 'CORPORATE');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('UNRECONCILED', 'RECONCILED', 'EXCEPTION');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'SUBMITTED', 'CONFIRMED', 'FAILED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'GRACE_PERIOD', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SupportCategory" AS ENUM ('ENROLLMENT', 'LOGIN_ACCESS', 'COURSE_NAVIGATION', 'MODULE_CONTENT', 'ASSESSMENT', 'CERTIFICATE', 'SUBSCRIPTION', 'PAYMENT', 'REFUND', 'TECHNICAL', 'FACULTY', 'COMPLAINT', 'PRIVACY_SECURITY', 'OTHER');

-- CreateEnum
CREATE TYPE "SupportStatus" AS ENUM ('WAITING', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_SUBSCRIBER', 'PENDING_INTERNAL', 'ESCALATED', 'RESOLVED', 'CLOSED', 'REOPENED');

-- CreateEnum
CREATE TYPE "SupportPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "SupportChannel" AS ENUM ('CHAT', 'TICKET');

-- CreateEnum
CREATE TYPE "VendorType" AS ENUM ('CONTENT_AUTHOR', 'SUBJECT_MATTER_EXPERT', 'INSTRUCTOR', 'VIDEO_PRODUCTION', 'ASSESSMENT_DEVELOPER', 'TECHNOLOGY', 'MARKETING', 'PAYMENT_SERVICE', 'HOSTING_SUPPORT', 'AFFILIATE');

-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('PROPOSED', 'DUE_DILIGENCE', 'DOCUMENTS_PENDING', 'UNDER_REVIEW', 'APPROVED', 'CONTRACTED', 'ACTIVE', 'PERFORMANCE_REVIEW', 'RENEWAL', 'OFFBOARDING', 'OFFBOARDED');

-- CreateEnum
CREATE TYPE "DeliverableStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'CHANGES_REQUESTED', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VendorInvoiceStatus" AS ENUM ('SUBMITTED', 'VALIDATED', 'APPROVED', 'PAYMENT_INITIATED', 'PAID', 'RECONCILED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EnrolmentState" ADD VALUE 'SUSPENDED';
ALTER TYPE "EnrolmentState" ADD VALUE 'CANCELLED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderState" ADD VALUE 'PENDING';
ALTER TYPE "OrderState" ADD VALUE 'CANCELLED';
ALTER TYPE "OrderState" ADD VALUE 'PARTIALLY_REFUNDED';
ALTER TYPE "OrderState" ADD VALUE 'DISPUTED';

-- AlterEnum
ALTER TYPE "ProductKind" ADD VALUE 'SUBSCRIPTION';

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'VENDOR';

-- DropForeignKey
ALTER TABLE "Lesson" DROP CONSTRAINT "Lesson_moduleId_fkey";

-- DropForeignKey
ALTER TABLE "Progress" DROP CONSTRAINT "Progress_lessonId_fkey";

-- DropForeignKey
ALTER TABLE "Quiz" DROP CONSTRAINT "Quiz_lessonId_fkey";

-- DropForeignKey
ALTER TABLE "QuizAttempt" DROP CONSTRAINT "QuizAttempt_quizId_fkey";

-- DropIndex
DROP INDEX "Certificate_userId_programId_key";

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "actorRoles" TEXT[],
ADD COLUMN     "correlationId" TEXT,
ADD COLUMN     "outcome" TEXT NOT NULL DEFAULT 'success';

-- AlterTable
ALTER TABLE "Certificate" ADD COLUMN     "courseVersion" INTEGER,
ADD COLUMN     "evidence" JSONB,
ADD COLUMN     "replacesId" TEXT,
ADD COLUMN     "revokedById" TEXT;

-- AlterTable
ALTER TABLE "Enrolment" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "orgId" TEXT,
ADD COLUMN     "source" "EnrolmentSource" NOT NULL DEFAULT 'ADMIN';

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "completionRule" "LessonCompletion" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "effectiveDate" TIMESTAMP(3),
ADD COLUMN     "freePreview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lockVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "objectives" TEXT[];

-- AlterTable
ALTER TABLE "Module" ADD COLUMN     "estimatedMinutes" INTEGER,
ADD COLUMN     "lockVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "objectives" TEXT[],
ADD COLUMN     "state" "PublishState" NOT NULL DEFAULT 'PUBLISHED';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "discount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "number" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'razorpay',
ADD COLUMN     "subtotal" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tax" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Organisation" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "billingEmail" TEXT,
ADD COLUMN     "contractEnd" TIMESTAMP(3),
ADD COLUMN     "contractStart" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "reconciledAt" TIMESTAMP(3),
ADD COLUMN     "reconciledById" TEXT,
ADD COLUMN     "reconciliation" "ReconciliationStatus" NOT NULL DEFAULT 'UNRECONCILED',
ADD COLUMN     "reconciliationNote" TEXT,
ADD COLUMN     "settledAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "description" TEXT,
ADD COLUMN     "graceDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "interval" "BillingInterval",
ADD COLUMN     "levelId" TEXT,
ADD COLUMN     "taxPercent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trialDays" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Program" ADD COLUMN     "academicReviewerId" TEXT,
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "complianceReviewerId" TEXT,
ADD COLUMN     "complianceSensitive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "difficulty" TEXT,
ADD COLUMN     "disclaimer" TEXT,
ADD COLUMN     "durationMinutes" INTEGER,
ADD COLUMN     "effectiveDate" TIMESTAMP(3),
ADD COLUMN     "includedInSubscription" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isFree" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "levelId" TEXT,
ADD COLUMN     "lockVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ownerId" TEXT,
ADD COLUMN     "prerequisites" TEXT[],
ADD COLUMN     "publishedVersionId" TEXT,
ADD COLUMN     "reviewDate" TIMESTAMP(3),
ADD COLUMN     "scheduledFor" TIMESTAMP(3),
ADD COLUMN     "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "thumbnailId" TEXT;

-- AlterTable
ALTER TABLE "Progress" ADD COLUMN     "lastViewedAt" TIMESTAMP(3),
ADD COLUMN     "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "bankId" TEXT,
ADD COLUMN     "drawCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "instructions" TEXT,
ADD COLUMN     "kind" "AssessmentKind" NOT NULL DEFAULT 'KNOWLEDGE_CHECK',
ADD COLUMN     "maxAttempts" INTEGER,
ADD COLUMN     "randomizeOptions" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "randomizeQuestions" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "retakeWaitMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "showAnswers" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "timeLimitMinutes" INTEGER;

-- AlterTable
ALTER TABLE "QuizAttempt" ADD COLUMN     "attemptNo" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "breakdown" JSONB,
ADD COLUMN     "courseVersion" INTEGER,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "feedback" TEXT,
ADD COLUMN     "gradedAt" TIMESTAMP(3),
ADD COLUMN     "gradedById" TEXT,
ADD COLUMN     "pointsAwarded" INTEGER,
ADD COLUMN     "pointsPossible" INTEGER,
ADD COLUMN     "snapshot" JSONB,
ADD COLUMN     "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" "AttemptStatus" NOT NULL DEFAULT 'GRADED',
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ALTER COLUMN "score" DROP NOT NULL,
ALTER COLUMN "passed" DROP NOT NULL;

-- AlterTable
ALTER TABLE "QuizQuestion" ADD COLUMN     "answerKey" JSONB,
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "bankId" TEXT,
ADD COLUMN     "competency" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "difficulty" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "remediationLessonId" TEXT,
ADD COLUMN     "scenario" TEXT,
ADD COLUMN     "targets" TEXT[],
ADD COLUMN     "type" "QuestionType" NOT NULL DEFAULT 'SINGLE',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "quizId" DROP NOT NULL,
ALTER COLUMN "correct" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Refund" ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "consumptionPct" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "decidedAt" TIMESTAMP(3),
ADD COLUMN     "decisionNote" TEXT,
ADD COLUMN     "exceptional" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifiedAt" TIMESTAMP(3),
ADD COLUMN     "policyEligible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reconciled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requestedById" TEXT,
ADD COLUMN     "status" "RefundStatus" NOT NULL DEFAULT 'REQUESTED',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "country" TEXT,
ADD COLUMN     "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "lastLoginIp" TEXT,
ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ADD COLUMN     "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "previousLoginAt" TIMESTAMP(3),
ADD COLUMN     "status" "AccountStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "timezone" TEXT,
ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TwoFactor" (
    "id" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "backupCodes" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "failedVerificationCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),

    CONSTRAINT "TwoFactor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "lastRequest" BIGINT NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffRoleAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "grantedById" TEXT,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffRoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "kind" "ApprovalKind" NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "summary" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "decidedById" TEXT,
    "decisionNote" TEXT,
    "decidedAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "failure" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "version" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminNote" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "PrivacyRequestKind" NOT NULL,
    "status" "PrivacyRequestStatus" NOT NULL DEFAULT 'OPEN',
    "detail" TEXT,
    "handledById" TEXT,
    "resolution" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivacyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Counter" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Counter_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "OrgGroup" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgGroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,

    CONSTRAINT "OrgGroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgGroupCourse" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgGroupCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "orgId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningLevel" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayTitle" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "shortDescription" TEXT NOT NULL,
    "description" TEXT,
    "audience" TEXT,
    "prerequisites" TEXT[],
    "outcomes" TEXT[],
    "coreTopics" TEXT[],
    "estimatedEffort" TEXT,
    "assessmentRequirement" TEXT,
    "passingCriteria" TEXT,
    "completionRequirement" TEXT,
    "badgeName" TEXT,
    "accent" TEXT NOT NULL DEFAULT 'teal',
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "disclaimer" TEXT,
    "ownerId" TEXT,
    "academicReviewerId" TEXT,
    "complianceReviewerId" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "reviewDate" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentBlock" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "kind" "BlockKind" NOT NULL,
    "data" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentRevision" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "courseId" TEXT,
    "version" INTEGER NOT NULL,
    "editorId" TEXT,
    "reason" TEXT,
    "changes" JSONB NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseVersion" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "mediaIds" TEXT[],
    "changeSummary" TEXT,
    "submittedById" TEXT,
    "academicApproverId" TEXT,
    "complianceApproverId" TEXT,
    "publishedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "effectiveDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewDecision" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "stage" "ReviewStage" NOT NULL,
    "decision" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "comment" TEXT,
    "draftStamp" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "title" TEXT NOT NULL,
    "altText" TEXT,
    "fileKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "uploadedById" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionBank" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "competency" TEXT,
    "description" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionBank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttemptUpload" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttemptUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LevelBadge" (
    "id" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LevelBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "orderId" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "graceEndsAt" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" TIMESTAMP(3),
    "gatewayRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'received',
    "error" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "category" "SupportCategory" NOT NULL,
    "priority" "SupportPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "SupportStatus" NOT NULL DEFAULT 'WAITING',
    "channel" "SupportChannel" NOT NULL DEFAULT 'TICKET',
    "assigneeId" TEXT,
    "escalatedTo" TEXT,
    "isComplaint" BOOLEAN NOT NULL DEFAULT false,
    "firstResponseAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "followUpAt" TIMESTAMP(3),
    "rating" INTEGER,
    "feedback" TEXT,
    "reopenCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "internal" BOOLEAN NOT NULL DEFAULT false,
    "masked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResponseTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" "SupportCategory",
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "approvedById" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResponseTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "tradingName" TEXT,
    "type" "VendorType" NOT NULL,
    "status" "VendorStatus" NOT NULL DEFAULT 'PROPOSED',
    "country" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "services" TEXT,
    "commercialModel" TEXT,
    "riskRating" TEXT NOT NULL DEFAULT 'medium',
    "complianceClass" TEXT,
    "dataAccessClass" TEXT NOT NULL DEFAULT 'none',
    "contractOwnerId" TEXT,
    "contractStart" TIMESTAMP(3),
    "contractEnd" TIMESTAMP(3),
    "accessExpiresAt" TIMESTAMP(3),
    "payoutReference" TEXT,
    "payoutLast4" TEXT,
    "taxIdLast4" TEXT,
    "payoutChangedById" TEXT,
    "payoutChangedAt" TIMESTAMP(3),
    "onboardingChecklist" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorMember" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorDocument" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "uploadedById" TEXT,
    "visibleToVendor" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deliverable" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "programId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "DeliverableStatus" NOT NULL DEFAULT 'ASSIGNED',
    "fee" INTEGER NOT NULL DEFAULT 0,
    "acceptedAt" TIMESTAMP(3),
    "reworkCount" INTEGER NOT NULL DEFAULT 0,
    "qualityScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deliverable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliverableSubmission" (
    "id" TEXT NOT NULL,
    "deliverableId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "note" TEXT,
    "link" TEXT,
    "fileKey" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliverableSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliverableComment" (
    "id" TEXT NOT NULL,
    "deliverableId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliverableComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorInvoice" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "deliverableId" TEXT,
    "number" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "VendorInvoiceStatus" NOT NULL DEFAULT 'SUBMITTED',
    "note" TEXT,
    "submittedById" TEXT NOT NULL,
    "validatedById" TEXT,
    "approvedById" TEXT,
    "paidById" TEXT,
    "paymentRef" TEXT,
    "paidAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TwoFactor_userId_idx" ON "TwoFactor"("userId");

-- CreateIndex
CREATE INDEX "TwoFactor_secret_idx" ON "TwoFactor"("secret");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimit_key_key" ON "RateLimit"("key");

-- CreateIndex
CREATE INDEX "StaffRoleAssignment_role_idx" ON "StaffRoleAssignment"("role");

-- CreateIndex
CREATE UNIQUE INDEX "StaffRoleAssignment_userId_role_key" ON "StaffRoleAssignment"("userId", "role");

-- CreateIndex
CREATE INDEX "ApprovalRequest_status_kind_idx" ON "ApprovalRequest"("status", "kind");

-- CreateIndex
CREATE INDEX "ApprovalRequest_targetType_targetId_idx" ON "ApprovalRequest"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "ConsentRecord_userId_kind_idx" ON "ConsentRecord"("userId", "kind");

-- CreateIndex
CREATE INDEX "AdminNote_subjectId_createdAt_idx" ON "AdminNote"("subjectId", "createdAt");

-- CreateIndex
CREATE INDEX "PrivacyRequest_status_idx" ON "PrivacyRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OrgGroup_orgId_name_key" ON "OrgGroup"("orgId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "OrgGroupMember_groupId_memberId_key" ON "OrgGroupMember"("groupId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "OrgGroupCourse_groupId_programId_key" ON "OrgGroupCourse"("groupId", "programId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");

-- CreateIndex
CREATE INDEX "Invitation_email_idx" ON "Invitation"("email");

-- CreateIndex
CREATE UNIQUE INDEX "LearningLevel_slug_key" ON "LearningLevel"("slug");

-- CreateIndex
CREATE INDEX "LearningLevel_status_sequence_idx" ON "LearningLevel"("status", "sequence");

-- CreateIndex
CREATE INDEX "ContentBlock_lessonId_sortOrder_idx" ON "ContentBlock"("lessonId", "sortOrder");

-- CreateIndex
CREATE INDEX "ContentRevision_courseId_createdAt_idx" ON "ContentRevision"("courseId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContentRevision_entityType_entityId_version_key" ON "ContentRevision"("entityType", "entityId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "CourseVersion_courseId_version_key" ON "CourseVersion"("courseId", "version");

-- CreateIndex
CREATE INDEX "ReviewDecision_courseId_createdAt_idx" ON "ReviewDecision"("courseId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_fileKey_key" ON "MediaAsset"("fileKey");

-- CreateIndex
CREATE INDEX "MediaAsset_kind_archivedAt_idx" ON "MediaAsset"("kind", "archivedAt");

-- CreateIndex
CREATE INDEX "AttemptUpload_attemptId_idx" ON "AttemptUpload"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "LevelBadge_serial_key" ON "LevelBadge"("serial");

-- CreateIndex
CREATE UNIQUE INDEX "LevelBadge_userId_levelId_key" ON "LevelBadge"("userId", "levelId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_orderId_key" ON "Subscription"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_gatewayRef_key" ON "Subscription"("gatewayRef");

-- CreateIndex
CREATE INDEX "Subscription_userId_status_idx" ON "Subscription"("userId", "status");

-- CreateIndex
CREATE INDEX "WebhookEvent_status_createdAt_idx" ON "WebhookEvent"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_provider_eventId_key" ON "WebhookEvent"("provider", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "SupportTicket_reference_key" ON "SupportTicket"("reference");

-- CreateIndex
CREATE INDEX "SupportTicket_status_priority_idx" ON "SupportTicket"("status", "priority");

-- CreateIndex
CREATE INDEX "SupportTicket_requesterId_idx" ON "SupportTicket"("requesterId");

-- CreateIndex
CREATE INDEX "SupportTicket_assigneeId_status_idx" ON "SupportTicket"("assigneeId", "status");

-- CreateIndex
CREATE INDEX "SupportMessage_ticketId_createdAt_idx" ON "SupportMessage"("ticketId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_code_key" ON "Vendor"("code");

-- CreateIndex
CREATE INDEX "Vendor_status_idx" ON "Vendor"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VendorMember_vendorId_userId_key" ON "VendorMember"("vendorId", "userId");

-- CreateIndex
CREATE INDEX "VendorDocument_vendorId_idx" ON "VendorDocument"("vendorId");

-- CreateIndex
CREATE INDEX "Deliverable_vendorId_status_idx" ON "Deliverable"("vendorId", "status");

-- CreateIndex
CREATE INDEX "DeliverableSubmission_deliverableId_idx" ON "DeliverableSubmission"("deliverableId");

-- CreateIndex
CREATE INDEX "DeliverableComment_deliverableId_createdAt_idx" ON "DeliverableComment"("deliverableId", "createdAt");

-- CreateIndex
CREATE INDEX "VendorInvoice_status_idx" ON "VendorInvoice"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VendorInvoice_vendorId_number_key" ON "VendorInvoice"("vendorId", "number");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Certificate_userId_programId_idx" ON "Certificate"("userId", "programId");

-- CreateIndex
CREATE INDEX "Enrolment_programId_state_idx" ON "Enrolment"("programId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "Order_number_key" ON "Order"("number");

-- CreateIndex
CREATE INDEX "Order_state_createdAt_idx" ON "Order"("state", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_reconciliation_idx" ON "Payment"("reconciliation");

-- CreateIndex
CREATE UNIQUE INDEX "Program_publishedVersionId_key" ON "Program"("publishedVersionId");

-- CreateIndex
CREATE INDEX "Program_levelId_sortOrder_idx" ON "Program"("levelId", "sortOrder");

-- CreateIndex
CREATE INDEX "Program_status_idx" ON "Program"("status");

-- CreateIndex
CREATE INDEX "QuizAttempt_status_idx" ON "QuizAttempt"("status");

-- Data: number existing attempts per learner and quiz before the uniqueness rule applies.
UPDATE "QuizAttempt" qa SET "attemptNo" = r.n,
  "submittedAt" = COALESCE(qa."submittedAt", qa."createdAt"),
  "gradedAt" = COALESCE(qa."gradedAt", qa."createdAt"),
  "startedAt" = qa."createdAt"
FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY "quizId", "userId" ORDER BY "createdAt", id) AS n FROM "QuizAttempt") r
WHERE qa.id = r.id;

-- CreateIndex
CREATE UNIQUE INDEX "QuizAttempt_quizId_userId_attemptNo_key" ON "QuizAttempt"("quizId", "userId", "attemptNo");

-- CreateIndex
CREATE INDEX "QuizQuestion_bankId_idx" ON "QuizQuestion"("bankId");

-- CreateIndex
CREATE INDEX "Refund_status_idx" ON "Refund"("status");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- AddForeignKey
ALTER TABLE "TwoFactor" ADD CONSTRAINT "TwoFactor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffRoleAssignment" ADD CONSTRAINT "StaffRoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminNote" ADD CONSTRAINT "AdminNote_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminNote" ADD CONSTRAINT "AdminNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyRequest" ADD CONSTRAINT "PrivacyRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgGroup" ADD CONSTRAINT "OrgGroup_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgGroupMember" ADD CONSTRAINT "OrgGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "OrgGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgGroupMember" ADD CONSTRAINT "OrgGroupMember_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "OrgMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgGroupCourse" ADD CONSTRAINT "OrgGroupCourse_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "OrgGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgGroupCourse" ADD CONSTRAINT "OrgGroupCourse_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "LearningLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_publishedVersionId_fkey" FOREIGN KEY ("publishedVersionId") REFERENCES "CourseVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentBlock" ADD CONSTRAINT "ContentBlock_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseVersion" ADD CONSTRAINT "CourseVersion_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewDecision" ADD CONSTRAINT "ReviewDecision_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "QuestionBank"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "QuestionBank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptUpload" ADD CONSTRAINT "AttemptUpload_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "QuizAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrolment" ADD CONSTRAINT "Enrolment_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Progress" ADD CONSTRAINT "Progress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LevelBadge" ADD CONSTRAINT "LevelBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LevelBadge" ADD CONSTRAINT "LevelBadge_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "LearningLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorMember" ADD CONSTRAINT "VendorMember_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorMember" ADD CONSTRAINT "VendorMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorDocument" ADD CONSTRAINT "VendorDocument_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deliverable" ADD CONSTRAINT "Deliverable_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deliverable" ADD CONSTRAINT "Deliverable_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliverableSubmission" ADD CONSTRAINT "DeliverableSubmission_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "Deliverable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliverableComment" ADD CONSTRAINT "DeliverableComment_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "Deliverable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorInvoice" ADD CONSTRAINT "VendorInvoice_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorInvoice" ADD CONSTRAINT "VendorInvoice_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "Deliverable"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Data migration
-- ---------------------------------------------------------------------------

-- Existing verified accounts are active; unverified ones are awaiting verification.
UPDATE "User" SET "status" = 'ACTIVE' WHERE "emailVerified" = true;

-- Lesson bodies become the first TEXT block of each lesson. The body column is kept, unread.
INSERT INTO "ContentBlock" ("id", "lessonId", "kind", "data", "sortOrder", "createdAt", "updatedAt")
SELECT 'cb_' || "id", "id", 'TEXT', jsonb_build_object('text', "body"), 0, now(), now()
FROM "Lesson" WHERE "body" IS NOT NULL AND btrim("body") <> '';

-- Single-choice questions get a typed answer key.
UPDATE "QuizQuestion" SET "answerKey" = jsonb_build_object('index', "correct") WHERE "answerKey" IS NULL;

-- Courses that were visible keep their place in the workflow. Their first release snapshot is
-- written by scripts/backfill-releases.ts (run by the seed and by `npm run db:backfill`).
UPDATE "Program" SET "status" = 'PUBLISHED' WHERE "state" = 'PUBLISHED';

-- ---------------------------------------------------------------------------
-- The audit trail is append-only. Rows can be written, never changed or removed, by the
-- application or by anyone sharing its database role.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION audit_log_is_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only: % is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_no_update BEFORE UPDATE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION audit_log_is_append_only();
CREATE TRIGGER audit_log_no_delete BEFORE DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION audit_log_is_append_only();
