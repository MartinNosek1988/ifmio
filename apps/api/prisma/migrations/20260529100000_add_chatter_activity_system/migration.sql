-- CreateEnum
CREATE TYPE "ChatMessageType" AS ENUM ('USER_MESSAGE', 'SYSTEM_LOG', 'EMAIL_INBOUND', 'EMAIL_OUTBOUND');
CREATE TYPE "ActivityKind" AS ENUM ('EMAIL', 'CALL', 'MEETING', 'TASK', 'DOCUMENT_UPLOAD', 'SIGN_REQUEST', 'REMINDER');
CREATE TYPE "ActivityStatus" AS ENUM ('PLANNED', 'DONE', 'CANCELLED', 'OVERDUE');

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "type" "ChatMessageType" NOT NULL DEFAULT 'USER_MESSAGE',
    "body" TEXT NOT NULL,
    "htmlBody" TEXT,
    "authorId" TEXT,
    "emailFrom" TEXT,
    "emailTo" TEXT,
    "emailSubject" TEXT,
    "emailMsgId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chat_attachments" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chat_attachments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chat_mentions" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "chat_mentions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "activity_types" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ActivityKind" NOT NULL,
    "defaultDays" INTEGER,
    "icon" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activity_types_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "activityTypeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "deadline" TIMESTAMP(3) NOT NULL,
    "assignedToId" TEXT NOT NULL,
    "status" "ActivityStatus" NOT NULL DEFAULT 'PLANNED',
    "doneAt" TIMESTAMP(3),
    "doneById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_messages_tenantId_entityType_entityId_idx" ON "chat_messages"("tenantId", "entityType", "entityId");
CREATE UNIQUE INDEX "activity_types_tenantId_name_key" ON "activity_types"("tenantId", "name");
CREATE INDEX "activities_tenantId_entityType_entityId_idx" ON "activities"("tenantId", "entityType", "entityId");
CREATE INDEX "activities_tenantId_assignedToId_status_deadline_idx" ON "activities"("tenantId", "assignedToId", "status", "deadline");

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "chat_attachments" ADD CONSTRAINT "chat_attachments_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_mentions" ADD CONSTRAINT "chat_mentions_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_mentions" ADD CONSTRAINT "chat_mentions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activities" ADD CONSTRAINT "activities_activityTypeId_fkey" FOREIGN KEY ("activityTypeId") REFERENCES "activity_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "activities" ADD CONSTRAINT "activities_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "activities" ADD CONSTRAINT "activities_doneById_fkey" FOREIGN KEY ("doneById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
